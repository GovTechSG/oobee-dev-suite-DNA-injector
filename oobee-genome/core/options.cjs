const DEFAULT_OPTIONS = {
    includePatterns: [/\.(ts|tsx|js|jsx|mjs|cjs|vue|html?)$/],
    excludePatterns: [/node_modules/, /\.d\.ts$/, /\.spec\.(tsx|jsx|ts|js)$/, /\.test\.(tsx|jsx|ts|js)$/],
    blacklist: [],
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
