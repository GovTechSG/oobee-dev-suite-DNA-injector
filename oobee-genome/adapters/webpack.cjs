const { injectDNA, shouldTransform } = require('../core/transformer.cjs');
const { mergeOptions } = require('../core/options.cjs');
const { isDevelopmentBuild } = require('../core/environment.cjs');

module.exports = function oobeeWebpackLoader(source) {
    const loaderOptions = this.getOptions ? this.getOptions() : {};
    const mergedOptions = mergeOptions(loaderOptions);

    // Fail-closed dev gate — see webpack.js for rationale.
    if (!isDevelopmentBuild()) return source;
    if (!mergedOptions.enabled) return source;

    const filePath = this.resourcePath;
    if (!shouldTransform(filePath, mergedOptions)) return source;

    try {
        const transformed = injectDNA(source, filePath, mergedOptions);
        return transformed;
    } catch (error) {
        console.error(`[oobee-genome] Error transforming ${filePath}:`, error);
        return source;
    }
};

module.exports.default = module.exports;
