import { createRequire } from 'module';
import { resolve } from 'path';

const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const MagicString = require('magic-string');
const parse5 = require('parse5');
const { parse: parseVueSfc } = require('@vue/compiler-sfc');
const { parse: parseVueTemplate, ElementTypes } = require('@vue/compiler-dom');

// Convert a character offset in the original source into 1-based line/column.
function getPosition(str, index) {
    const lines = str.substring(0, index).split('\n');
    return {
        line: lines.length,
        column: lines[lines.length - 1].length + 1
    };
}

// Bundlers can append query strings to module IDs, e.g. App.tsx?t=123.
// Strip those before resolving so parser dispatch sees the real extension.
function getSourcePath(filePath) {
    const cleanPath = filePath.split('?')[0];
    return resolve(cleanPath);
}

function getFileKind(sourcePath) {
    if (/\.(tsx|jsx|ts|js)$/.test(sourcePath)) return 'react';
    if (/\.vue$/.test(sourcePath)) return 'vue';
    if (/\.html$/.test(sourcePath)) return 'html';
    return 'unsupported';
}

function parseJavaScriptLike(code, sourcePath) {
    const isTypeScript = /\.(ts|tsx)$/.test(sourcePath);
    const canContainJsx = /\.(js|jsx|tsx)$/.test(sourcePath);
    const plugins = [];

    if (isTypeScript) plugins.push('typescript');
    if (canContainJsx) plugins.push('jsx');

    return parse(code, {
        sourceType: 'unambiguous',
        allowReturnOutsideFunction: true,
        plugins
    });
}

function walk(node, visitor) {
    if (!node || typeof node !== 'object') return;
    if (typeof node.type === 'string') visitor(node);

    for (const key of Object.keys(node)) {
        // Babel nodes mix real syntax with parser metadata, e.g.
        // {
        //   type: 'JSXOpeningElement',
        //   start: 0,
        //   end: 5,
        //   loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } },
        //   name: { type: 'JSXIdentifier', name: 'div' },
        //   attributes: []
        // }
        // Genome only follows child syntax such as name/attributes/body.
        // Position, comment, and "extra" fields are useful metadata, but they
        // are not code nodes that can contain JSX or createElement calls.
        if (
            key === 'loc' ||
            key === 'start' ||
            key === 'end' ||
            key === 'leadingComments' ||
            key === 'trailingComments' ||
            key === 'innerComments' ||
            key === 'extra'
        ) {
            continue;
        }

        const value = node[key];
        if (Array.isArray(value)) {
            for (const child of value) walk(child, visitor);
        } else if (value && typeof value === 'object') {
            walk(value, visitor);
        }
    }
}

// Normalize Babel's JSX name node into a string:
// <div> -> "div", <Layout.Main> -> "Layout.Main", <svg:path> -> "svg:path".
function getJsxName(node) {
    if (!node) return null;
    if (node.type === 'JSXIdentifier') return node.name;
    if (node.type === 'JSXNamespacedName') {
        const namespace = getJsxName(node.namespace);
        const name = getJsxName(node.name);
        return namespace && name ? `${namespace}:${name}` : null;
    }
    if (node.type === 'JSXMemberExpression') {
        const object = getJsxName(node.object);
        const property = getJsxName(node.property);
        return object && property ? `${object}.${property}` : null;
    }
    return null;
}

// Only add DNA to JSX tags that become real DOM elements directly.
// <div> and <button> are safe. <Button> or <Layout.Main> are React
// components, and they may ignore, rename, or reject extra props, so skip them.
function isComponentJsxName(nameNode, tagName) {
    if (!tagName) return true;
    if (nameNode.type === 'JSXMemberExpression') return true;
    return /^[A-Z]/.test(tagName);
}

function shouldInjectJsxElement(openingElement, tagName, options) {
    if (!tagName) return false;
    if (options.blacklist.includes(tagName)) return false;
    if (isComponentJsxName(openingElement.name, tagName)) return false;
    return true;
}

function hasJsxDnaAttribute(openingElement, prefix) {
    const wanted = new Set([
        `${prefix}-path`,
        `${prefix}-line`,
        `${prefix}-column`
    ]);

    return openingElement.attributes.some((attribute) => {
        if (attribute.type !== 'JSXAttribute') return false;
        return wanted.has(getJsxName(attribute.name));
    });
}

function getStringPropertyName(key) {
    if (!key) return null;
    if (key.type === 'Identifier') return key.name;
    if (key.type === 'StringLiteral') return key.value;
    if (key.type === 'Literal') return String(key.value);
    return null;
}

function hasObjectDnaProperty(objectExpression, prefix) {
    const wanted = new Set([
        `${prefix}-path`,
        `${prefix}-line`,
        `${prefix}-column`
    ]);

    return objectExpression.properties.some((property) => {
        if (!property || property.type === 'SpreadElement') return false;
        return wanted.has(getStringPropertyName(property.key));
    });
}

function hasAttributeName(attributes, prefix) {
    const wanted = new Set([
        `${prefix}-path`,
        `${prefix}-line`,
        `${prefix}-column`
    ]);

    return attributes.some((attribute) => wanted.has(attribute && attribute.name));
}

// Match React.createElement(...) calls in the AST. This intentionally accepts
// only the dot form, not React['createElement'], to keep the transform narrow.
function isReactCreateElementCall(node) {
    if (node.type !== 'CallExpression') return false;
    const callee = node.callee;
    return (
        callee &&
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.object &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'React' &&
        callee.property &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'createElement'
    );
}

// Match document.createElement(...) calls so vanilla JS DOM creation can also
// receive metadata. Only string tag arguments are handled by the caller.
function isDocumentCreateElementCall(node) {
    if (node.type !== 'CallExpression') return false;
    const callee = node.callee;
    return (
        callee &&
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.object &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'document' &&
        callee.property &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'createElement'
    );
}

// Pull out tag names only when they are written as real strings:
// React.createElement('div') -> 'div', safe to inject.
// React.createElement(Button) -> null, because Button is a component variable.
function getStringLiteralValue(node) {
    if (!node) return null;
    if (node.type === 'StringLiteral') return node.value;
    if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
    return null;
}

// React.createElement's second argument is the props object. When it is null or
// undefined, React treats that as "no props", so Genome can replace it safely:
// React.createElement('div', null) -> React.createElement('div', { data... }).
function isNullishProps(node) {
    if (!node) return false;
    if (node.type === 'NullLiteral') return true;
    if (node.type === 'Identifier' && node.name === 'undefined') return true;
    if (node.type === 'Literal' && node.value === null) return true;
    return false;
}

// Build JSX/HTML-style attributes for insertion after a tag name:
// <button data-oobee-path="..." data-oobee-line="..." ...>
function getJsxAttributes(code, offset, escapedPath, prefix) {
    const pos = getPosition(code, offset);
    return (
        ` ${prefix}-path="${escapedPath}"` +
        ` ${prefix}-line="${pos.line}"` +
        ` ${prefix}-column="${pos.column}"`
    );
}

// Build object-literal props for React.createElement:
// { 'data-oobee-path': "...", 'data-oobee-line': "...", ... }
function getObjectAttributes(code, offset, escapedPath, prefix) {
    const pos = getPosition(code, offset);
    return (
        ` '${prefix}-path': "${escapedPath}",` +
        ` '${prefix}-line': "${pos.line}",` +
        ` '${prefix}-column': "${pos.column}",`
    );
}

// Build imperative DOM metadata setters for document.createElement wrappers.
// JSON.stringify handles escaping for JavaScript string literals.
function getSetAttributeStatements(code, offset, sourcePath, prefix) {
    const pos = getPosition(code, offset);
    return [
        `__oobeeEl.setAttribute(${JSON.stringify(`${prefix}-path`)}, ${JSON.stringify(sourcePath)});`,
        `__oobeeEl.setAttribute(${JSON.stringify(`${prefix}-line`)}, ${JSON.stringify(String(pos.line))});`,
        `__oobeeEl.setAttribute(${JSON.stringify(`${prefix}-column`)}, ${JSON.stringify(String(pos.column))});`
    ].join(' ');
}

function injectReactDNA(code, sourcePath, options) {
    const ast = parseJavaScriptLike(code, sourcePath);
    const escapedPath = sourcePath.replace(/"/g, '\\"');
    const prefix = options.attributePrefix;
    const edits = [];

    walk(ast, (node) => {
        if (node.type === 'JSXOpeningElement') {
            const tagName = getJsxName(node.name);
            if (!shouldInjectJsxElement(node, tagName, options)) return;
            if (hasJsxDnaAttribute(node, prefix)) return;

            edits.push({
                start: node.name.end,
                end: node.name.end,
                content: getJsxAttributes(code, node.start, escapedPath, prefix)
            });
            return;
        }

        // React.createElement uses:
        //   arg[0] = tag/component, arg[1] = props, arg[2+] = children.
        // Genome only injects when arg[0] is a string DOM tag:
        //   React.createElement('div') -> add attrs as the props object
        //   React.createElement('div', null) -> replace null with an attrs object
        //   React.createElement('div', { className: 'box' }) -> insert attrs into existing props
        //   React.createElement(Button, null) -> skip because Button is a component
        // "attrs" is the generated data-oobee properties string.
        if (isReactCreateElementCall(node)) {
            const tagName = getStringLiteralValue(node.arguments[0]);
            if (!tagName || options.blacklist.includes(tagName)) return;

            const props = node.arguments[1];
            const attrs = getObjectAttributes(code, node.start, escapedPath, prefix);

            if (!props) {
                edits.push({
                    start: node.arguments[0].end,
                    end: node.arguments[0].end,
                    content: `, {${attrs} }`
                });
            } else if (isNullishProps(props)) {
                edits.push({
                    start: props.start,
                    end: props.end,
                    content: `{${attrs} }`
                });
            } else if (props.type === 'ObjectExpression' && !hasObjectDnaProperty(props, prefix)) {
                edits.push({
                    start: props.start + 1,
                    end: props.start + 1,
                    content: attrs
                });
            }
            return;
        }

        // document.createElement is the vanilla JS path for code-created DOM:
        //   document.createElement('button') -> create element, set attrs, return it
        //   container.appendChild(document.createElement('div')) -> still works inline
        // Genome wraps the call in an IIFE so the expression keeps returning the
        // created element after data-oobee attributes are applied with setAttribute.
        if (isDocumentCreateElementCall(node)) {
            const tagName = getStringLiteralValue(node.arguments[0]);
            if (!tagName || options.blacklist.includes(tagName)) return;

            const originalCall = code.slice(node.start, node.end);
            edits.push({
                start: node.start,
                end: node.end,
                content:
                    `(() => { const __oobeeEl = ${originalCall}; ` +
                    `${getSetAttributeStatements(code, node.start, sourcePath, prefix)} ` +
                    'return __oobeeEl; })()'
            });
        }
    });

    if (edits.length === 0) return code;

    const magic = new MagicString(code);
    // Apply edits from right to left because all offsets refer to the original
    // code; changing later text first keeps earlier coordinates valid.
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
        if (edit.start === edit.end) {
            magic.appendLeft(edit.start, edit.content);
        } else {
            magic.overwrite(edit.start, edit.end, edit.content);
        }
    }

    return magic.toString();
}

// HTML transformer for standalone templates. parse5 gives source offsets for
// real start tags, so the transform can skip comments/text and preserve layout.
function injectHtmlDNA(code, sourcePath, options) {
    const ast = parse5.parseFragment(code, { sourceCodeLocationInfo: true });
    const escapedPath = sourcePath.replace(/"/g, '\\"');
    const prefix = options.attributePrefix;
    const edits = [];

    function visit(node) {
        if (node.tagName && node.sourceCodeLocation && node.sourceCodeLocation.startTag) {
            const location = node.sourceCodeLocation.startTag;
            const attrs = Object.keys(location.attrs || {}).map((name) => ({ name }));

            if (!options.blacklist.includes(node.tagName) && !hasAttributeName(attrs, prefix)) {
                edits.push({
                    start: location.startOffset + 1 + node.tagName.length,
                    content: getJsxAttributes(code, location.startOffset, escapedPath, prefix)
                });
            }
        }

        for (const child of node.childNodes || []) visit(child);
    }

    for (const child of ast.childNodes || []) visit(child);

    if (edits.length === 0) return code;

    const magic = new MagicString(code);
    // Apply edits from right to left because all offsets refer to the original
    // code; changing later text first keeps earlier coordinates valid.
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
        magic.appendLeft(edit.start, edit.content);
    }
    return magic.toString();
}

// Vue single-file component transformer. Only the <template> block is edited;
// script/style content is left alone. Vue component tags are currently treated
// by the Vue compiler's element kind, while normal rendered elements are tagged.
function injectVueDNA(code, sourcePath, options) {
    const parsed = parseVueSfc(code);
    const template = parsed.descriptor && parsed.descriptor.template;
    if (!template) return code;

    const ast = parseVueTemplate(template.content, { comments: true });
    const escapedPath = sourcePath.replace(/"/g, '\\"');
    const prefix = options.attributePrefix;
    const baseOffset = template.loc.start.offset;
    const edits = [];

    function visit(node) {
        if (node.type === 1 && node.tagType === ElementTypes.ELEMENT) {
            const attrs = (node.props || []).map((prop) => ({ name: prop.name }));
            if (!options.blacklist.includes(node.tag) && !hasAttributeName(attrs, prefix)) {
                const absoluteStart = baseOffset + node.loc.start.offset;
                edits.push({
                    start: absoluteStart + 1 + node.tag.length,
                    content: getJsxAttributes(code, absoluteStart, escapedPath, prefix)
                });
            }
        }

        for (const child of node.children || []) visit(child);
    }

    for (const child of ast.children || []) visit(child);

    if (edits.length === 0) return code;

    const magic = new MagicString(code);
    // Apply edits from right to left because all offsets refer to the original
    // code; changing later text first keeps earlier coordinates valid.
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
        magic.appendLeft(edit.start, edit.content);
    }
    return magic.toString();
}

function injectDNA(code, filePath, options = {}) {
    const mergedOptions = {
        blacklist: ['void', 'string', 'number', 'boolean', 'any', 'unknown', 'React'],
        includePatterns: [/\.(tsx|jsx|js|ts|vue|html)$/],
        excludePatterns: [/node_modules/],
        attributePrefix: 'data-oobee',
        ...options
    };

    const {
        includePatterns,
        excludePatterns
    } = mergedOptions;

    if (!includePatterns.some(pattern => pattern.test(filePath))) return code;
    if (excludePatterns.some(pattern => pattern.test(filePath))) return code;

    const sourcePath = getSourcePath(filePath);
    const kind = getFileKind(sourcePath);

    if (kind === 'react') {
        return injectReactDNA(code, sourcePath, mergedOptions);
    }

    if (kind === 'html') {
        return injectHtmlDNA(code, sourcePath, mergedOptions);
    }

    if (kind === 'vue') {
        return injectVueDNA(code, sourcePath, mergedOptions);
    }

    return code;
}

function shouldTransform(filePath, options = {}) {
    const {
        includePatterns = [/\.(tsx|jsx|js|ts|vue|html)$/],
        excludePatterns = [/node_modules/]
    } = options;

    const matches = includePatterns.some(pattern => pattern.test(filePath));
    const excluded = excludePatterns.some(pattern => pattern.test(filePath));

    return matches && !excluded;
}

export {
    getPosition,
    injectDNA,
    shouldTransform
};
