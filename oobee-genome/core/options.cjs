const DEFAULT_OPTIONS = {
    includePatterns: [/\.(ts|tsx|js|jsx|vue|html)$/],
    excludePatterns: [/node_modules/, /\.d\.ts$/, /\.spec\.(tsx|jsx)$/, /\.test\.(tsx|jsx)$/],
    blacklist: ['void', 'string', 'number', 'boolean', 'any', 'unknown', 'React'],
    attributePrefix: 'data-oobee',
    enabled: true,
    verbose: false
};

function mergeOptions(userOptions = {}) {
    return {
        ...DEFAULT_OPTIONS,
        ...userOptions,
        includePatterns: userOptions.includePatterns || DEFAULT_OPTIONS.includePatterns,
        excludePatterns: userOptions.excludePatterns || DEFAULT_OPTIONS.excludePatterns,
        blacklist: userOptions.blacklist || DEFAULT_OPTIONS.blacklist
    };
}

module.exports = {
    DEFAULT_OPTIONS,
    mergeOptions
};
