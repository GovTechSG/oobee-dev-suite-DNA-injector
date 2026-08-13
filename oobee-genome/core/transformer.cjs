const { relative, resolve } = require('path');

/**
 * Returns the 1-based line and column for a character at `index` inside `str`.
 *
 * Strategy: slice everything up to `index`, split on newlines.
 * The number of resulting segments = line number.
 * The length of the last segment = column (characters after the last newline).
 */
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
    // Strip query strings that bundlers append to virtual module IDs
    // e.g. "/src/App.tsx?t=1234" → "/src/App.tsx"
    const cleanPath = filePath.split('?')[0];
    return resolve(cleanPath);
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
    const escapedPath = sourcePath.replace(/"/g, '\\"');

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
    //   (?<![>\w])           Negative lookbehind — the character immediately
    //                        before `<` must NOT be a word character (a-z, A-Z,
    //                        0-9, _) or `>`. This eliminates TypeScript generics
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
    const regex = /(?<![>\w])<([A-Z][a-zA-Z0-9\.]*|[a-z][a-z0-9\-]*)(?=[\s>/])/g;

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
    let result = code;
    for (let i = injections.length - 1; i >= 0; i--) {
        const { offset, tagName } = injections[i];
        const pos = getPosition(code, offset); // line/col from the ORIGINAL source
        const dnaAttrs = ` data-oobee-path="${escapedPath}" data-oobee-line="${pos.line}" data-oobee-column="${pos.column}"`;
        const insertAt = offset + 1 + tagName.length;
        result = result.slice(0, insertAt) + dnaAttrs + result.slice(insertAt);
    }

    return result;
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
