# Abstract Syntax Tree(AST)-Based DOM Injection — Migration Plan

## Background

The current transformer uses a two-pass approach:
1. **Mask** TypeScript type-declaration regions (type aliases, interfaces, declare blocks,
   import type lines) by replacing them with spaces — preserving all character positions.
2. **Regex** scan the masked code for `<TagName` patterns using a lookbehind + lookahead
   to distinguish JSX tags from TypeScript generics.
3. **Inject** `data-oobee-*` attributes into the original source at the collected positions,
   applied in reverse order so earlier offsets stay valid.

This works well for the common cases but has remaining blind spots:
- TypeScript generics that appear outside declaration blocks (e.g. inline function type
  annotations: `const fn: <T>(x: T) => T`)
- Files where `.ts` is used with Babel JSX processing

The goal of this migration is to replace the regex approach with a **framework-aware,
AST-based strategy** that knows exactly where DOM rendering code lives in each framework.

---

## Core Concept

Instead of defensively masking what we do NOT want, switch to a **positive** approach:
identify exactly where rendering/template code lives per framework and only ever touch
that zone.

```
Current:  mask TS regions → regex on remainder → inject
Proposed: detect framework → extract render regions → AST/regex on regions → inject
```

---

## Phase 0 — Dependency

### Package to add

```json
"dependencies": {
    "@babel/parser": "^7.24.0"
}
```

**Why `@babel/parser` only (not `@babel/traverse`):**
- `@babel/parser` alone parses JSX + TypeScript into an AST (~900 KB).
- A hand-written 30-line recursive walker replaces `@babel/traverse`, keeping the
  footprint minimal.
- Every React/Vue/Next.js project already has Babel in its dependency tree, so this
  adds no new transitive cost in practice.

### How to add

```bash
cd oobee-genome
npm install @babel/parser
```

---

## Phase 1 — Framework Detector

### New files

```
core/framework-detector.js     (ESM)
core/framework-detector.cjs    (CJS)
core/framework-detector.d.ts   (TypeScript declarations)
```

### Detection logic

The detector receives the file path and raw source string and returns one of five
strategy tokens.

| Return value | Condition |
|---|---|
| `'react'`   | Extension is `.tsx` or `.jsx`, OR extension is `.js`/`.ts` and source contains `from 'react'` or `from "react"` |
| `'vue-sfc'` | Extension is `.vue` |
| `'html'`    | Extension is `.html` |
| `'angular'` | Extension is `.ts` and source contains `@Component(` |
| `'generic'` | Anything else — falls back to current masking approach |

### API

```js
// ESM
export function detectFramework(filePath, code) { ... }

// CJS
module.exports = { detectFramework };
```

### TypeScript declaration (`core/framework-detector.d.ts`)

```ts
export type Framework = 'react' | 'vue-sfc' | 'html' | 'angular' | 'generic';

export declare function detectFramework(filePath: string, code: string): Framework;
```

### Implementation sketch

```js
function detectFramework(filePath, code) {
    if (filePath.endsWith('.vue'))  return 'vue-sfc';
    if (filePath.endsWith('.html')) return 'html';

    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) return 'react';

    if (/from\s+['"]react['"]/.test(code) ||
        /require\(['"]react['"]\)/.test(code)) return 'react';

    if (filePath.endsWith('.ts') && /@Component\s*\(/.test(code)) return 'angular';

    return 'generic';
}
```

---

## Phase 2 — AST Transformer

### New files

```
core/ast-transformer.js     (ESM)
core/ast-transformer.cjs    (CJS)
core/ast-transformer.d.ts   (TypeScript declarations)
```

### Responsibility

Handles the `'react'` strategy. Uses `@babel/parser` to parse the source into an AST,
then a hand-written recursive walker visits every `JSXOpeningElement` node and records
its exact character offset (from `node.start`) and tag name.

### Why this is accurate

The Babel parser already understands the full TypeScript + JSX grammar. By the time
we walk the tree, every node is classified correctly:
- `JSXOpeningElement` → real DOM/component tag
- `TSTypeParameterDeclaration` → TypeScript generic → simply never visited
- `StringLiteral` → inside a string → never visited
- `Comment` → stripped by the parser → never visited

### API

```js
// Both ESM and CJS
function injectJSX(code, escapedFilePath, blacklist) { ... }
// Returns the transformed source string with data-oobee-* attributes injected.
```

### TypeScript declaration

```ts
export declare function injectJSX(
    code: string,
    escapedFilePath: string,
    blacklist: string[]
): string;
```

### Implementation sketch

```js
import { parse } from '@babel/parser';

function injectJSX(code, escapedFilePath, blacklist) {
    let ast;
    try {
        ast = parse(code, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript'],
            errorRecovery: true,   // don't throw on syntax errors
        });
    } catch {
        // If parsing fails, return code unchanged rather than crashing the build
        return code;
    }

    // Collect all JSXOpeningElement positions
    const injections = [];
    walkAST(ast, (node) => {
        if (node.type !== 'JSXOpeningElement') return;

        // node.name is JSXIdentifier, JSXMemberExpression, or JSXNamespacedName
        const tagName = resolveTagName(node.name);
        if (!tagName || blacklist.includes(tagName)) return;

        injections.push({
            offset: node.start,   // character offset of `<` in original source
            tagName,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,   // 1-based to match getPosition()
        });
    });

    // Apply in reverse order — same strategy as current transformer
    let result = code;
    for (let i = injections.length - 1; i >= 0; i--) {
        const { offset, tagName, line, column } = injections[i];
        const dnaAttrs =
            ` data-oobee-path="${escapedFilePath}"` +
            ` data-oobee-line="${line}"` +
            ` data-oobee-column="${column}"`;
        const insertAt = offset + 1 + tagName.length;  // right after <tagName
        result = result.slice(0, insertAt) + dnaAttrs + result.slice(insertAt);
    }

    return result;
}

// Recursive AST walker — visits every node and calls visitor(node)
function walkAST(node, visitor) {
    if (!node || typeof node !== 'object') return;
    visitor(node);
    for (const key of Object.keys(node)) {
        const child = node[key];
        if (Array.isArray(child)) {
            child.forEach(c => walkAST(c, visitor));
        } else if (child && typeof child === 'object' && child.type) {
            walkAST(child, visitor);
        }
    }
}

// Resolve the tag name string from JSXIdentifier / JSXMemberExpression
function resolveTagName(nameNode) {
    if (nameNode.type === 'JSXIdentifier') return nameNode.name;
    if (nameNode.type === 'JSXMemberExpression') {
        // e.g. React.Fragment → "React.Fragment"
        return resolveTagName(nameNode.object) + '.' + nameNode.property.name;
    }
    return null;
}
```

---

## Phase 3 — Vue SFC Template Extractor

### No new file needed

This logic is small enough to live inside `transformer.js` / `transformer.cjs` as a
helper function, OR in a `core/vue-extractor.js` if you prefer separation.

### How it works

`.vue` Single File Components have a guaranteed textual boundary:

```html
<template lang="html">
    <div>...</div>          ← only this section gets injected
</template>

<script setup lang="ts">
    interface Props<T> { }  ← TypeScript, completely ignored
</script>
```

Strategy:
1. Use a regex to find the start/end byte offsets of the `<template>` block.
2. Extract that substring.
3. Run the **existing regex inject** (not AST — the template is pure HTML, no TS ambiguity).
4. Splice the injected template back into the original source at the same byte range.

```js
function injectVueSFC(code, escapedFilePath, blacklist, getPosition) {
    // Match <template ...> ... </template> (handles lang="html", lang="pug", etc.)
    const templateMatch = code.match(/<template(?:\s[^>]*)?>[\s\S]*?<\/template>/);
    if (!templateMatch) return code;  // no template section found

    const templateStart = templateMatch.index;
    const templateEnd   = templateStart + templateMatch[0].length;
    const template      = templateMatch[0];

    // Run the existing regex + inject on the template substring only
    const injectedTemplate = regexInject(template, escapedFilePath, blacklist, getPosition, templateStart);

    return code.slice(0, templateStart) + injectedTemplate + code.slice(templateEnd);
}
```

Note: `regexInject` would be the extracted inner logic of the current transformer
(regex scan + reverse inject), accepting a `baseOffset` parameter so positions are
relative to the full file, not the template substring.

---

## Phase 4 — Refactor `injectDNA` into a Dispatcher

### What changes in `core/transformer.js` and `core/transformer.cjs`

`injectDNA` becomes a routing function. The `maskTypeScriptRegions` function stays in
place and continues to serve the `'generic'` fallback.

```js
function injectDNA(code, filePath, options = {}) {
    // ... (file filter guards unchanged) ...

    const escapedPath  = getSourcePath(filePath).replace(/"/g, '\\"');
    const framework    = detectFramework(filePath, code);

    switch (framework) {
        case 'react':
            return injectJSX(code, escapedPath, blacklist);

        case 'vue-sfc':
            return injectVueSFC(code, escapedPath, blacklist, getPosition);

        case 'html':
            // HTML has no TypeScript — run the regex on the full file
            return regexInject(code, escapedPath, blacklist, getPosition, 0);

        case 'angular':
            // Phase 5 — not yet implemented; fall through to generic
            // return injectAngularTemplate(code, escapedPath, blacklist, getPosition);

        case 'generic':
        default:
            // Current masking approach — unchanged safety net
            return maskAndRegexInject(code, escapedPath, blacklist, getPosition);
    }
}
```

---

## Phase 5 — Angular Inline Templates (Follow-up)

Angular components keep their template in one of two places:

**External file** (`.html`) — already handled by the `'html'` strategy via the
file extension check. No extra work needed.

**Inline template** inside the decorator:
```ts
@Component({
    selector: 'app-root',
    template: `
        <div class="container">...</div>
    `
})
```

Strategy using the AST:
1. Parse the `.ts` file with `@babel/parser` (TypeScript plugin, no JSX plugin).
2. Walk the AST looking for a `Decorator` node whose `expression.callee.name === 'Component'`.
3. Inside its arguments object, find the `template` property whose value is a
   `TemplateLiteral` or `StringLiteral`.
4. Record the byte range of the template value (between the backticks / quotes).
5. Run the HTML regex inject on only that substring.
6. Splice back into the full source.

This is lower priority — external template files (`.html`) are the far more common pattern.

---

## Package.json Changes

### Add dependency

```json
"dependencies": {
    "@babel/parser": "^7.24.0"
}
```

### Add new exports entries

```json
"./core/framework-detector": {
    "types":   "./core/framework-detector.d.ts",
    "import":  "./core/framework-detector.js",
    "require": "./core/framework-detector.cjs"
},
"./core/ast-transformer": {
    "types":   "./core/ast-transformer.d.ts",
    "import":  "./core/ast-transformer.js",
    "require": "./core/ast-transformer.cjs"
}
```

---

## Files Summary

| File | Status |
|---|---|
| `core/framework-detector.js` | **Create** |
| `core/framework-detector.cjs` | **Create** |
| `core/framework-detector.d.ts` | **Create** |
| `core/ast-transformer.js` | **Create** |
| `core/ast-transformer.cjs` | **Create** |
| `core/ast-transformer.d.ts` | **Create** |
| `core/transformer.js` | **Modify** — add dispatcher, import new modules |
| `core/transformer.cjs` | **Modify** — same |
| `core/transformer.d.ts` | **Minor update** — no API surface changes |
| `package.json` | **Modify** — add dependency + two new exports entries |

### Files that do NOT change

- All adapter files (`vite`, `webpack`, `next`, `rollup`, `esbuild`, `angular`)
- All adapter `.d.ts` files
- `core/options.*` — no changes
- `core/utils.*` — no changes
- `index.js`, `index.cjs`, `index.d.ts` — no changes

---

## Public API — No Breaking Changes

All existing public function signatures remain identical:

```ts
injectDNA(code, filePath, options?)   // same signature, smarter internals
shouldTransform(filePath, options?)   // unchanged
getPosition(str, index)               // unchanged
```

The `maskTypeScriptRegions` helper becomes internal-only (it already was), continuing
to serve as the `'generic'` fallback strategy.

---

## Suggested Implementation Order

1. **Install `@babel/parser`** and verify it resolves in the workspace
2. **`framework-detector`** — self-contained, easy to test with a few `console.log` calls
3. **`ast-transformer`** — the core of the new logic; test with a sample `.tsx` file
4. **Vue SFC extraction** — simplest framework case, no AST needed
5. **Wire up the dispatcher** in `transformer.js` / `transformer.cjs`
6. **Update `package.json`** exports map
7. **Angular inline templates** — optional follow-up phase

---

## To implement: point to this file and say "implement the AST migration plan"
