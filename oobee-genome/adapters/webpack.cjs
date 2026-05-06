const { injectDNA, shouldTransform } = require('../core/transformer.cjs');
const { mergeOptions } = require('../core/options.cjs');

module.exports = function oobeeWebpackLoader(source) {
    const loaderOptions = this.getOptions ? this.getOptions() : {};
    const mergedOptions = mergeOptions(loaderOptions);

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
