const DEFAULT_OPTIONS = {
    // File patterns to include for transformation
    includePatterns: [/\.(ts|tsx|js|jsx|vue|html)$/],

    // File patterns to exclude from transformation
    excludePatterns: [/node_modules/, /\.d\.ts$/, /\.spec\.(tsx|jsx)$/, /\.test\.(tsx|jsx)$/],

    // Component/tag names to blacklist from transformation
    blacklist: ['void', 'string', 'number', 'boolean', 'any', 'unknown', 'React'],

    // Attribute prefix for DNA data
    attributePrefix: 'data-oobee',

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
