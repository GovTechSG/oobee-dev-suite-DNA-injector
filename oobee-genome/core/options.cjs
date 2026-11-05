const DEFAULT_OPTIONS = {
    includePatterns: [/\.(ts|tsx|js|jsx|vue|html)$/],
    excludePatterns: [/node_modules/, /\.d\.ts$/, /\.spec\.(tsx|jsx)$/, /\.test\.(tsx|jsx)$/],
    blacklist: [],
    attributePrefix: 'data-oobee',
    pathRoot: '.',

    // Also tag library-rendered child elements (MUI <input>/<label>, Vuetify internals)
    // in the browser by copying the nearest tagged ancestor's attributes.
    inheritChildren: true,
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
