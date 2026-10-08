const { relative, resolve, sep } = require('path');

/**
 * Returns the 1-based line and column for a character at `index` inside `str`.
 *
 * Public API — external callers may still call this directly, so it must
 * work standalone. The old implementation allocated `str.substring(0,index)`
 * plus a `split('\n')` on every call, giving O(str.length) time+memory per
 * lookup. When invoked once per JSX/HTML tag inside injectDNA that produced
 * an overall O(N·L) ≈ O(L²) transform (32k tags took ~4s, 64k ~16s in the
 * asgard-0005 repro). Internal callers now precompute a line index once via
 * buildLineIndex() and call positionFromIndex() for O(log L) lookups; this
 * top-level helper does the same on the fly so callers get the fast path
 * without changing shape.
 */
function getPosition(str, index) {
    const nlOffsets = buildLineIndex(str);
    return positionFromIndex(nlOffsets, index);
}

// O(L) single pass — collects every '\n' byte offset in the source. Reused
// by every getPosition-equivalent lookup inside injectDNA to avoid the
// quadratic substring+split pattern the original code used per injection.
function buildLineIndex(str) {
    const offsets = [];
    for (let i = 0, len = str.length; i < len; i++) {
        if (str.charCodeAt(i) === 10) offsets.push(i);
    }
    return offsets;
}

// O(log L) binary search over a precomputed newline-offset array. Returns
// the same {line, column} shape as the original substring+split
// implementation — verified against edge cases (index=0, index at newline,
// first char of next line, out-of-tree indices).
function positionFromIndex(nlOffsets, index) {
    let lo = 0;
    let hi = nlOffsets.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (nlOffsets[mid] < index) lo = mid + 1;
        else hi = mid;
    }
    const line = lo + 1;
    const lastNlBefore = lo === 0 ? -1 : nlOffsets[lo - 1];
    return { line, column: index - lastNlBefore };
}

function getRelativePath(filePath, rootPath = process.cwd()) {
    return relative(rootPath, filePath);
}

// Emit a project-relative path (never the absolute build-host path). The
// prior CJS version returned resolve(cleanPath), which baked the OS
// username / CI runner layout / internal directory structure into every
// `data-oobee-*` attribute of the shipped bundle — the ESM twin was
// hardened for exactly this and the CJS build accidentally shipped
// unpatched. Escapes above the project root are collapsed to the file's
// basename so a spurious `..` chain cannot re-leak parent segments.
function getSourcePath(filePath) {
    const cleanPath = String(filePath).split('?')[0];
    const absolute = resolve(cleanPath);
    const projectRoot = resolve(process.cwd());
    let rel = relative(projectRoot, absolute);
    if (!rel) return '.';
    if (rel.startsWith('..' + sep) || rel === '..') {
        const parts = absolute.split(/[\\/]/);
        rel = parts[parts.length - 1] || rel;
    }
    return rel;
}

// HTML attribute-value escape. Used when splicing the source-file path into a
// JSX/HTML attribute (`data-oobee-path="..."`). Backslash escaping is inert in
// HTML — an attacker-controlled path like `foo" onload=alert(1) x="` would
// break out of the attribute if we did the JS-style backslash escape. We must
// entity-encode `&`, `<`, `>`, and `"` so the parsed attribute value equals
// the original path and no additional attributes materialize.
function encodeHtmlAttr(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// JS string-literal escape. Used when splicing the source-file path into a
// JavaScript string in generated code (`'data-oobee-path': "..."`). Manual
// double-quote escaping is not enough — a path containing `\` + `"` becomes
// `\\"` which terminates the string. JSON.stringify handles backslashes,
// quotes, control characters, and non-BMP correctly and returns the value
// wrapped in double quotes.
function encodeJsString(s) {
    return JSON.stringify(String(s));
}

/**
 * Produces a "shadow" copy of the source file where every TypeScript
 * type-declaration region is replaced with plain spaces.
 *
 * WHY THIS IS NEEDED
 * ──────────────────
 * The JSX injection regex looks for `<TagName` patterns. TypeScript uses
 * identical angle-bracket syntax for generic type parameters:
 *
 *   type Fn = <T>(x: T) => T          ← <T> is NOT a DOM element
 *   interface Props<T extends object>  ← <T extends…> is NOT a DOM element
 *
 * Without masking, the regex would inject `data-oobee-*` attributes into
 * those positions, producing invalid TypeScript that breaks compilation.
 *
 * THE POSITION-PRESERVATION CONTRACT
 * ────────────────────────────────────
 * `getPosition(code, offset)` derives line/column numbers by counting
 * characters in the original source. For its results to stay accurate, every
 * character position in the mask must map to the exact same position in the
 * original. We achieve this by:
 *
 *   • Replacing non-newline characters with spaces (same byte count).
 *   • Never touching newline characters (line count stays identical).
 *
 * So if `<T>` sits at character 342 in the original, it is replaced by `   `
 * (three spaces) at character 342 in the mask — and the regex simply won't
 * find a `<` there anymore.
 *
 * WHAT GETS MASKED
 * ────────────────
 * A line is the start of a type region when its leading (non-whitespace)
 * content matches one of:
 *
 *   type Foo = …              (type alias)
 *   export type Foo = …
 *   interface Foo { … }       (interface declaration)
 *   export interface Foo …
 *   declare …                 (ambient declaration)
 *   import type { … }         (type-only import)
 *   import type Foo from …
 *
 * HOW MULTI-LINE BLOCKS ARE HANDLED
 * ───────────────────────────────────
 * After spotting an opening line, we count `{` vs `}` to track brace depth.
 * While depth > 0 every subsequent line is also masked. When depth drops
 * back to 0 the closing brace was encountered and normal processing resumes.
 *
 * Example:
 *
 *   interface Props {        ← depth becomes 1  → masked
 *     name: string;          ← depth stays 1    → masked
 *     render: <T>() => T;    ← depth stays 1    → masked  (<T> hidden ✓)
 *   }                        ← depth becomes 0  → masked (last line of block)
 *   return <div className…>  ← depth is 0, not a type decl → NOT masked ✓
 */
function maskTypeScriptRegions(code) {
    const lines = code.split('\n');
    const out = [];
    let inBlock = false; // are we currently inside a multi-line type block?
    let depth = 0;       // net unclosed `{` count inside the current block

    for (const line of lines) {
        // trimStart so leading indentation is ignored when matching keywords
        const trimmed = line.trimStart();

        if (!inBlock) {
            // ── Detect the start of a TypeScript type-only declaration ──────
            //
            // Regex breakdown:
            //   ^(?:export\s+)?          optional `export` keyword
            //   (?:                      one of:
            //     type\s+\w              `type X` — type alias
            //     |interface\s+\w        `interface X` — interface
            //     |declare\s+            `declare …` — ambient declaration
            //   )
            //
            // Second pattern covers `import type { … }` and `import type Foo`
            const isTypeDecl =
                /^(?:export\s+)?(?:type\s+\w|interface\s+\w|declare\s+)/.test(trimmed) ||
                /^import\s+type[\s{]/.test(trimmed);

            if (isTypeDecl) {
                // Count brace balance on this opening line.
                // If it opens a block (depth > 0) we must keep masking
                // subsequent lines until the block closes.
                depth = (line.match(/\{/g) || []).length
                      - (line.match(/\}/g) || []).length;
                if (depth > 0) inBlock = true; // block continues on next lines

                // Replace every character with a space — but keep the same
                // total length so downstream character offsets stay valid.
                out.push(' '.repeat(line.length));
            } else {
                // Normal code — keep as-is so the regex can find JSX tags.
                out.push(line);
            }
        } else {
            // ── Inside a multi-line type block ───────────────────────────────
            // Update the brace depth and check whether the block just closed.
            depth += (line.match(/\{/g) || []).length
                   - (line.match(/\}/g) || []).length;
            if (depth <= 0) inBlock = false; // block ended on this line

            // Mask regardless — this line is still part of the type block.
            out.push(' '.repeat(line.length));
        }
    }

    // Re-join with newlines (which were never replaced), restoring the exact
    // same line structure as the original source.
    return out.join('\n');
}

function injectDNA(code, filePath, options = {}) {
    const {
        blacklist = ['void', 'string', 'number', 'boolean', 'any', 'unknown', 'React'],
        includePatterns = [/\.(tsx|jsx|js|ts|vue|html)$/],
        excludePatterns = [/node_modules/]
    } = options;

    if (!includePatterns.some(pattern => pattern.test(filePath))) return code;
    if (excludePatterns.some(pattern => pattern.test(filePath))) return code;

    const sourcePath = getSourcePath(filePath);
    // Two different escape contexts: the JSX/HTML injector splices into an
    // attribute value (needs entity encoding), the createElement injector
    // splices into a JS string literal (needs JSON escaping). See the
    // encoders above for why manual `\"`-only escaping is broken in both.
    const attrEncodedPath = encodeHtmlAttr(sourcePath);
    const jsEncodedPath = encodeJsString(sourcePath);

    // ── Step 1: mask ──────────────────────────────────────────────────────
    // Build a shadow copy of the source where every TypeScript type-declaration
    // region (type aliases, interfaces, declare blocks, import type lines) is
    // replaced with spaces of the same length. Newlines are never touched, so
    // every character offset in the mask is identical to the original source.
    //
    // Result: the regex in Step 2 will only ever see actual JSX/HTML markup.
    const masked = maskTypeScriptRegions(code);

    // ── Step 2: find JSX/HTML opening tags ────────────────────────────────
    // Regex anatomy:
    //
    //   (?<![\w])            Negative lookbehind — the character immediately
    //                        before `<` must NOT be a word character (a-z, A-Z,
    //                        0-9, _). This eliminates TypeScript generics
    //                        written directly after an identifier:
    //                          useState<T>   ← `e` before `<` → skipped ✓
    //                          Array<string> ← `y` before `<` → skipped ✓
    //
    //   <                    The literal opening angle bracket.
    //
    //   (                    Capture group 1 — the tag name:
    //     [A-Z][a-zA-Z0-9\.]* ← PascalCase or namespaced: MyBtn, React.Fragment
    //     |                    or
    //     [a-z][a-z0-9\-]*    ← lowercase HTML: div, my-element
    //   )
    //
    //   (?=[\s>/])           Positive lookahead — the character right after the
    //                        tag name must be whitespace, `>`, or `/`. These are
    //                        the ONLY valid next characters for a JSX/HTML tag:
    //                          <div>         → followed by `>`  ✓
    //                          <div />       → followed by ` `  ✓
    //                          <MyComp key=… → followed by ` `  ✓
    //                        Anything else (`,`, `(`, another letter) means
    //                        this is a TypeScript generic, not a tag.
    const regex = /(?<![\w])<([A-Z][a-zA-Z0-9\.]*|[a-z][a-z0-9\-]*)(?=[\s>/])/g;

    // Collect every injection site.
    // The offsets come from the MASKED string, but because the mask preserves
    // all line lengths they are byte-identical to the original source offsets.
    const injections = [];
    let match;
    while ((match = regex.exec(masked)) !== null) {
        const tagName = match[1];
        // Skip blacklisted names (primitive TS types that somehow slipped through)
        if (blacklist.includes(tagName)) continue;
        injections.push({ offset: match.index, tagName });
    }

    // ── Step 3: inject attributes into the original source ────────────────
    // We iterate in REVERSE order (last match first). This is critical:
    // inserting text at position X makes all positions > X shift rightward.
    // By working backwards, every insertion only affects positions we've
    // already processed, so earlier offsets remain correct.
    //
    // For each match:
    //   offset         → position of `<` in the original source
    //   offset + 1     → position of the first character of tagName
    //   insertAt       → position right after the last character of tagName
    //                    (where we splice in the data-oobee-* attributes)
    //
    // Before: <div className="foo">
    //              ^
    //              insertAt
    //
    // After:  <div data-oobee-path="…" data-oobee-line="5" data-oobee-column="3" className="foo">
    // Precompute newline offsets once for the original source so each
    // position lookup is O(log L). Build the transformed source with a
    // forward segment scan instead of the previous
    // `result = result.slice(...) + attrs + result.slice(...)` splice,
    // which allocated a full copy of the string on every match (O(N·L) —
    // the *other* half of asgard-0005 that a pure getPosition fix wouldn't
    // have addressed). `injections` is already in ascending offset order
    // because it comes from a single regex.exec sweep.
    const codeLineIndex = buildLineIndex(code);
    const segments = [];
    let cursor = 0;
    for (const { offset, tagName } of injections) {
        const pos = positionFromIndex(codeLineIndex, offset);
        const dnaAttrs = ` data-oobee-path="${attrEncodedPath}" data-oobee-line="${pos.line}" data-oobee-column="${pos.column}"`;
        const insertAt = offset + 1 + tagName.length;
        segments.push(code.slice(cursor, insertAt));
        segments.push(dnaAttrs);
        cursor = insertAt;
    }
    segments.push(code.slice(cursor));
    let result = segments.join('');

    // ── Second pass: React.createElement() calls ──────────────────────────
    // Plain .ts files cannot use JSX angle-bracket syntax — TypeScript only
    // allows <Tag> in .tsx files. Authors fall back to React.createElement():
    //
    //   React.createElement('article', { style: {…} }, child)
    //
    // The JSX regex above finds nothing in such files, so we need a separate
    // pass that injects data-oobee-* into the props argument instead.
    result = injectCreateElementCalls(result, jsEncodedPath);

    return result;
}

/**
 * Second-pass injection for React.createElement() calls.
 *
 * JSX angle-bracket syntax is only valid in .tsx / .jsx files. In plain .ts
 * files every element must be constructed with React.createElement(), so the
 * first-pass JSX regex never fires. This function finds those calls and injects
 * data-oobee-* attributes into their props argument.
 *
 * Three props shapes are handled:
 *
 *   null / undefined  → replaced with { 'data-oobee-*': '…' }
 *   { … }             → attributes injected at the opening { of the object
 *   anything else     → left untouched (a variable, expression, etc.)
 *
 * Injection is applied in reverse offset order so earlier positions are not
 * shifted by later insertions — the same strategy used by the JSX pass.
 */
// `jsQuotedPath` MUST be a JSON.stringify'd path — that is, it already contains
// its surrounding double quotes and is safe against backslash / control-char
// / quote injection. See the earlier manual `\"`-only escape which allowed a
// path of `.../foo\"; ...js` to break out of the string literal.
function injectCreateElementCalls(code, jsQuotedPath) {
    const ceRegex =
        /\bReact\.createElement\(\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|[A-Za-z_$][\w$.]*)\s*,\s*/g;

    const injections = [];
    let m;

    while ((m = ceRegex.exec(code)) !== null) {
        const callStart  = m.index;
        const propsStart = m.index + m[0].length;
        const rest       = code.slice(propsStart);

        if (/^(?:null|undefined)\b/.test(rest)) {
            const nullLen = rest.match(/^(?:null|undefined)/)[0].length;
            injections.push({
                type: 'replace',
                callStart,
                replaceStart: propsStart,
                replaceEnd:   propsStart + nullLen,
            });
        } else if (rest[0] === '{') {
            injections.push({
                type: 'object',
                callStart,
                insertAt: propsStart + 1,
            });
        }
    }

    // O(L) newline scan + O(log L) per lookup and O(L + N) segment build —
    // same asgard-0005 treatment as the JSX pass. Iterate forward in
    // ascending callStart order (regex.exec produced them that way).
    const codeLineIndex = buildLineIndex(code);
    const segments = [];
    let cursor = 0;
    for (const inj of injections) {
        const pos = positionFromIndex(codeLineIndex, inj.callStart);
        const attrs =
            ` 'data-oobee-path': ${jsQuotedPath},` +
            ` 'data-oobee-line': "${pos.line}",` +
            ` 'data-oobee-column': "${pos.column}",`;

        if (inj.type === 'replace') {
            segments.push(code.slice(cursor, inj.replaceStart));
            segments.push(`{${attrs} }`);
            cursor = inj.replaceEnd;
        } else {
            segments.push(code.slice(cursor, inj.insertAt));
            segments.push(attrs);
            cursor = inj.insertAt;
        }
    }
    segments.push(code.slice(cursor));
    return segments.join('');
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

module.exports = {
    getPosition,
    getRelativePath,
    injectDNA,
    shouldTransform
};
