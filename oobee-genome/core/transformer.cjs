const { relative, resolve } = require('path');
const { isKnownLowercaseTag } = require('./elements.cjs');

function getPosition(str, index) {
    const lines = str.substring(0, index).split('\n');
    return {
        line: lines.length,
        column: lines[lines.length - 1].length + 1
    };
}

function getRelativePath(filePath, rootPath = process.cwd()) {
    return relative(rootPath, filePath);
}

function getSourcePath(filePath) {
    const cleanPath = filePath.split('?')[0];
    return resolve(cleanPath);
}

function detectFramework(filePath, code) {
    const p = filePath.split('?')[0].toLowerCase();
    if (p.endsWith('.vue')) return 'vue';
    if (p.endsWith('.html') || p.endsWith('.htm')) return 'html';
    if (p.endsWith('.tsx') || p.endsWith('.jsx')) return 'jsx';
    const hasAngularDecorator = /@Component\s*\(|@Directive\s*\(/.test(code);
    const hasLitTemplate = /(?:^|[^A-Za-z0-9_$])(?:html|svg|render)\s*`/.test(code);
    if (p.endsWith('.ts')) {
        if (hasAngularDecorator) return 'angular';
        if (hasLitTemplate) return 'lit';
        return 'ts-plain';
    }
    if (p.endsWith('.js') || p.endsWith('.mjs') || p.endsWith('.cjs')) {
        if (hasAngularDecorator) return 'angular';
        if (hasLitTemplate) return 'lit';
        if (/from\s+['"]react['"]|require\(\s*['"]react['"]\s*\)|React\.createElement\s*\(/.test(code)) return 'jsx';
        return 'js-plain';
    }
    return 'unknown';
}

function scanQuotedStringEnd(code, i) {
    const quote = code[i];
    let j = i + 1;
    while (j < code.length) {
        const c = code[j];
        if (c === '\\') { j += 2; continue; }
        if (c === quote) return j + 1;
        if (c === '\n' && (quote === "'" || quote === '"')) return j;
        j++;
    }
    return code.length;
}

function scanTemplateLiteralEnd(code, i) {
    let j = i + 1;
    while (j < code.length) {
        const c = code[j];
        if (c === '\\') { j += 2; continue; }
        if (c === '`') return j + 1;
        if (c === '$' && code[j + 1] === '{') {
            let depth = 1;
            j += 2;
            while (j < code.length && depth > 0) {
                const ch = code[j];
                if (ch === '`') { j = scanTemplateLiteralEnd(code, j); continue; }
                if (ch === "'" || ch === '"') { j = scanQuotedStringEnd(code, j); continue; }
                if (ch === '/' && code[j + 1] === '/') { j = code.indexOf('\n', j); if (j === -1) return code.length; continue; }
                if (ch === '/' && code[j + 1] === '*') { const e = code.indexOf('*/', j + 2); j = e === -1 ? code.length : e + 2; continue; }
                if (ch === '{') depth++;
                else if (ch === '}') depth--;
                j++;
            }
            continue;
        }
        j++;
    }
    return code.length;
}

function scanLineCommentEnd(code, i) {
    const nl = code.indexOf('\n', i);
    return nl === -1 ? code.length : nl;
}

function scanBlockCommentEnd(code, i) {
    const end = code.indexOf('*/', i + 2);
    return end === -1 ? code.length : end + 2;
}

function computeJsProtectedRanges(code, from, to) {
    const ranges = [];
    let i = from;
    while (i < to) {
        const c = code[i];
        const c2 = c + (code[i + 1] || '');
        if (c2 === '//') { const e = scanLineCommentEnd(code, i); ranges.push([i, Math.min(e, to)]); i = e; continue; }
        if (c2 === '/*') { const e = scanBlockCommentEnd(code, i); ranges.push([i, Math.min(e, to)]); i = e; continue; }
        if (c === '"' || c === "'") { const e = scanQuotedStringEnd(code, i); ranges.push([i, Math.min(e, to)]); i = e; continue; }
        if (c === '`') { const e = scanTemplateLiteralEnd(code, i); ranges.push([i, Math.min(e, to)]); i = e; continue; }
        i++;
    }
    return ranges;
}

function computeHtmlProtectedRanges(code, from, to) {
    const ranges = [];
    const patterns = [
        /<!--[\s\S]*?-->/g,
        /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,
        /<style\b[^>]*>[\s\S]*?<\/style\s*>/gi
    ];
    const region = code.slice(from, to);
    for (const re of patterns) {
        let m;
        re.lastIndex = 0;
        while ((m = re.exec(region)) !== null) {
            ranges.push([from + m.index, from + m.index + m[0].length]);
        }
    }
    return ranges;
}

function computeLitProtectedRanges(code, from, to) {
    const ranges = [];
    let i = from;
    while (i < to) {
        if (code[i] === '$' && code[i + 1] === '{') {
            let d = 1;
            let j = i + 2;
            while (j < to && d > 0) {
                const ch = code[j];
                if (ch === '"' || ch === "'") { j = scanQuotedStringEnd(code, j); continue; }
                if (ch === '`') { j = scanTemplateLiteralEnd(code, j); continue; }
                if (ch === '{') d++;
                else if (ch === '}') d--;
                j++;
            }
            ranges.push([i, Math.min(j, to)]);
            i = j;
            continue;
        }
        if (code[i] === '<' && code[i + 1] === '!' && code[i + 2] === '-' && code[i + 3] === '-') {
            const end = code.indexOf('-->', i + 4);
            const stop = end === -1 ? to : end + 3;
            ranges.push([i, Math.min(stop, to)]);
            i = stop;
            continue;
        }
        i++;
    }
    return ranges;
}

function findVueTemplateZones(code) {
    const zones = [];
    const open = /<template(?:\s[^>]*)?>/gi;
    let m;
    while ((m = open.exec(code)) !== null) {
        const start = m.index + m[0].length;
        const closeIdx = code.indexOf('</template>', start);
        if (closeIdx === -1) break;
        zones.push({ start, end: closeIdx, kind: 'html' });
        open.lastIndex = closeIdx + '</template>'.length;
    }
    return zones;
}

function findAngularTemplateZones(code) {
    const zones = [];
    const decoratorRe = /@(?:Component|Directive)\s*\(/g;
    let d;
    while ((d = decoratorRe.exec(code)) !== null) {
        let i = d.index + d[0].length;
        let depth = 1;
        const decoratorStart = i;
        while (i < code.length && depth > 0) {
            const c = code[i];
            const c2 = c + (code[i + 1] || '');
            if (c2 === '//') { i = scanLineCommentEnd(code, i); continue; }
            if (c2 === '/*') { i = scanBlockCommentEnd(code, i); continue; }
            if (c === '"' || c === "'") { i = scanQuotedStringEnd(code, i); continue; }
            if (c === '`') { i = scanTemplateLiteralEnd(code, i); continue; }
            if (c === '(') depth++;
            else if (c === ')') depth--;
            i++;
        }
        const decoratorEnd = i;

        const region = code.slice(decoratorStart, decoratorEnd);
        const tplRe = /\btemplate\s*:\s*(`|'|")/g;
        let t;
        while ((t = tplRe.exec(region)) !== null) {
            const quoteAbs = decoratorStart + t.index + t[0].length - 1;
            const quote = code[quoteAbs];
            const end = quote === '`' ? scanTemplateLiteralEnd(code, quoteAbs) : scanQuotedStringEnd(code, quoteAbs);
            zones.push({ start: quoteAbs + 1, end: end - 1, kind: 'html' });
        }
        decoratorRe.lastIndex = decoratorEnd;
    }
    return zones;
}

function findLitTemplateZones(code) {
    const zones = [];
    const tagRe = /(^|[^A-Za-z0-9_$])(html|svg)\s*`/g;
    let m;
    while ((m = tagRe.exec(code)) !== null) {
        const backtick = m.index + m[0].length - 1;
        const end = scanTemplateLiteralEnd(code, backtick);
        zones.push({ start: backtick + 1, end: end - 1, kind: 'lit' });
        tagRe.lastIndex = end;
    }
    return zones;
}

function getInjectionZones(code, framework) {
    switch (framework) {
        case 'html':
            return [{ start: 0, end: code.length, kind: 'html' }];
        case 'jsx':
            return [{ start: 0, end: code.length, kind: 'jsx' }];
        case 'vue':
            return findVueTemplateZones(code);
        case 'angular': {
            const zones = findAngularTemplateZones(code);
            const litZones = findLitTemplateZones(code);
            return zones.concat(litZones);
        }
        case 'lit':
            return findLitTemplateZones(code);
        case 'ts-plain':
        case 'js-plain':
        case 'unknown':
        default:
            return [];
    }
}

function getProtectedRanges(code, zone) {
    switch (zone.kind) {
        case 'html':
            return computeHtmlProtectedRanges(code, zone.start, zone.end);
        case 'lit':
            return computeLitProtectedRanges(code, zone.start, zone.end);
        case 'jsx':
            return computeJsProtectedRanges(code, zone.start, zone.end);
        default:
            return [];
    }
}

function isInsideAnyRange(offset, ranges) {
    for (const [s, e] of ranges) {
        if (offset >= s && offset < e) return true;
    }
    return false;
}

function classifyTag(code, tagStart, tagName) {
    const afterName = tagStart + 1 + tagName.length;
    if (afterName >= code.length) return { valid: false };
    const first = code[afterName];
    if (first === '>' || (first === '/' && code[afterName + 1] === '>')) {
        return { valid: true, isGenericSignal: false };
    }
    if (!(first === ' ' || first === '\t' || first === '\n' || first === '\r')) {
        return { valid: false };
    }
    let i = afterName;
    let hasTopLevelComma = false;
    let hasGenericKeyword = false;
    let ended = false;
    while (i < code.length && i - afterName < 4096) {
        const c = code[i];
        if (c === '<') return { valid: false };
        if (c === '>') { ended = true; break; }
        if (c === '/' && code[i + 1] === '>') { ended = true; break; }
        if (c === '"' || c === "'") { i = scanQuotedStringEnd(code, i); continue; }
        if (c === '`') { i = scanTemplateLiteralEnd(code, i); continue; }
        if (c === '{') {
            let d = 1;
            i++;
            while (i < code.length && d > 0) {
                const ch = code[i];
                if (ch === '"' || ch === "'") { i = scanQuotedStringEnd(code, i); continue; }
                if (ch === '`') { i = scanTemplateLiteralEnd(code, i); continue; }
                if (ch === '{') d++;
                else if (ch === '}') d--;
                i++;
            }
            continue;
        }
        if (c === ',') { hasTopLevelComma = true; i++; continue; }
        if (/[A-Za-z_$]/.test(c)) {
            let j = i;
            while (j < code.length && /[A-Za-z0-9_$]/.test(code[j])) j++;
            const word = code.slice(i, j);
            if (word === 'extends' || word === 'keyof' || word === 'typeof' || word === 'infer' || word === 'readonly') {
                hasGenericKeyword = true;
            }
            i = j;
            continue;
        }
        i++;
    }
    if (!ended) return { valid: false };
    return { valid: true, isGenericSignal: hasTopLevelComma || hasGenericKeyword };
}

function isImmediatelyPrecededByIdent(code, tagStart) {
    if (tagStart === 0) return false;
    const prev = code[tagStart - 1];
    if (/[A-Za-z0-9_$)\]]/.test(prev)) return true;
    if (prev === '.') return true;
    return false;
}

function injectDNA(code, filePath, options = {}) {
    const {
        blacklist,
        includePatterns = [/\.(ts|tsx|js|jsx|mjs|cjs|vue|html?)$/],
        excludePatterns = [/node_modules/, /\.d\.ts$/]
    } = options;

    if (!includePatterns.some(pattern => pattern.test(filePath))) return code;
    if (excludePatterns.some(pattern => pattern.test(filePath))) return code;

    const framework = detectFramework(filePath, code);
    const zones = getInjectionZones(code, framework);
    if (zones.length === 0) return code;

    const userBlacklist = new Set(Array.isArray(blacklist) ? blacklist : []);
    const escapedPath = getSourcePath(filePath).replace(/"/g, '\\"');
    const tagRegex = /<([A-Z][A-Za-z0-9_.]*|[a-z][a-z0-9\-]*)/g;

    const edits = [];
    for (const zone of zones) {
        const protectedRanges = getProtectedRanges(code, zone);
        tagRegex.lastIndex = zone.start;
        let m;
        while ((m = tagRegex.exec(code)) !== null) {
            if (m.index >= zone.end) break;
            const tagName = m[1];
            const offset = m.index;

            if (isInsideAnyRange(offset, protectedRanges)) continue;
            if (userBlacklist.has(tagName)) continue;

            const classification = classifyTag(code, offset, tagName);
            if (!classification.valid) continue;

            const isLower = /^[a-z]/.test(tagName);
            if (isLower) {
                if (!isKnownLowercaseTag(tagName, framework)) continue;
            } else {
                if (zone.kind === 'jsx' || zone.kind === 'lit') {
                    if (isImmediatelyPrecededByIdent(code, offset)) continue;
                    if (classification.isGenericSignal) continue;
                }
            }

            const pos = getPosition(code, offset);
            const insertAt = offset + m[0].length;
            const insertion = ` data-oobee-path="${escapedPath}" data-oobee-line="${pos.line}" data-oobee-column="${pos.column}"`;
            edits.push({ at: insertAt, text: insertion });
        }
    }

    if (edits.length === 0) return code;
    edits.sort((a, b) => a.at - b.at);
    let out = '';
    let cursor = 0;
    for (const e of edits) {
        out += code.slice(cursor, e.at) + e.text;
        cursor = e.at;
    }
    out += code.slice(cursor);
    return out;
}

function shouldTransform(filePath, options = {}) {
    const {
        includePatterns = [/\.(ts|tsx|js|jsx|mjs|cjs|vue|html?)$/],
        excludePatterns = [/node_modules/, /\.d\.ts$/]
    } = options;

    const matches = includePatterns.some(pattern => pattern.test(filePath));
    const excluded = excludePatterns.some(pattern => pattern.test(filePath));

    return matches && !excluded;
}

module.exports = {
    getPosition,
    getRelativePath,
    detectFramework,
    getInjectionZones,
    injectDNA,
    shouldTransform
};
