const DEFAULT_OPTIONS = {
    // File patterns to include for transformation
    includePatterns: [/\.(ts|tsx|js|jsx|vue|html)$/],

    // File patterns to exclude from transformation
    excludePatterns: [/node_modules/, /\.d\.ts$/, /\.spec\.(tsx|jsx)$/, /\.test\.(tsx|jsx)$/],

    // Extra tag/component names to skip (non-DOM wrappers such as Fragment are always skipped)
    blacklist: [],

    // Attribute prefix for DNA data
    attributePrefix: 'data-oobee',

    // Base directory for emitted source paths; resolved against the build cwd.
    pathRoot: '.',

    // Also tag library-rendered child elements (MUI <input>/<label>, Vuetify internals)
    // in the browser by copying the nearest tagged ancestor's attributes.
    inheritChildren: true,

    // Enable/disable transformation (useful for dev/prod)
    enabled: true,

    // Verbose logging
    verbose: false
};

function mergeOptions(userOptions = {}) {
    return {
        ...DEFAULT_OPTIONS,
        ...userOptions,
        // Deep merge for arrays
        includePatterns: userOptions.includePatterns || DEFAULT_OPTIONS.includePatterns,
        excludePatterns: userOptions.excludePatterns || DEFAULT_OPTIONS.excludePatterns,
        blacklist: userOptions.blacklist || DEFAULT_OPTIONS.blacklist
    };
}

export {
    DEFAULT_OPTIONS,
    mergeOptions
};
