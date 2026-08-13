const DEFAULT_OPTIONS = {
    // File patterns to include for transformation
    includePatterns: [/\.(ts|tsx|js|jsx|mjs|cjs|vue|html?)$/],

    // File patterns to exclude from transformation
    excludePatterns: [/node_modules/, /\.d\.ts$/, /\.spec\.(tsx|jsx|ts|js)$/, /\.test\.(tsx|jsx|ts|js)$/],

    // Extra component/tag names to skip. The transformer already excludes
    // TypeScript primitives and utility types by default; this list is merged
    // on top so users can add project-specific component names to skip.
    blacklist: [],

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
