function getPosition(str, index) {
    const lines = str.substring(0, index).split('\n');
    return {
        line: lines.length,
        column: lines[lines.length - 1].length + 1
    };
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

    const escapedPath = filePath.replace(/"/g, '\\"');
    const regex = /<([A-Z][a-zA-Z0-9\.]*|[a-z][a-z0-9\-]*)/g;

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

export {
    getPosition,
    injectDNA,
    shouldTransform
};
