const { relative } = require('path');

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

function injectDNA(code, filePath, options = {}) {
    const {
        blacklist = ['void', 'string', 'number', 'boolean', 'any', 'unknown', 'React'],
        includePatterns = [/\.(ts|tsx|js|jsx|vue|html)$/],
        excludePatterns = [/node_modules/]
    } = options;

    if (!includePatterns.some(pattern => pattern.test(filePath))) {
        return code;
    }

    if (excludePatterns.some(pattern => pattern.test(filePath))) {
        return code;
    }

    const relativePath = getRelativePath(filePath);
    const escapedPath = relativePath.replace(/"/g, '\\"');
    // Improved regex to only match JSX/HTML opening tags, not TypeScript generics
    // Uses negative lookbehind to exclude generics (preceded by identifier or >)
    // Uses lookahead to ensure followed by space, >, or / (JSX patterns)
    const regex = /(?<![>\w])<([A-Z][a-zA-Z0-9\.]*|[a-z][a-z0-9\-]*)(?=[\s>/])/g;

    const transformedCode = code.replace(
        regex,
        (match, tagName, offset) => {
            if (blacklist.includes(tagName)) {
                return match;
            }

            const pos = getPosition(code, offset);
            const dnaAttrs = ` data-oobee-path="${escapedPath}" data-oobee-line="${pos.line}" data-oobee-column="${pos.column}"`;
            return `${match}${dnaAttrs}`;
        }
    );

    return transformedCode;
}

function shouldTransform(filePath, options = {}) {
    const {
        includePatterns = [/\.(ts|tsx|js|jsx|vue|html)$/],
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
