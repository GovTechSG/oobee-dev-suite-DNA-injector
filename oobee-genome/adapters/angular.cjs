const { injectDNA, shouldTransform } = require('../core/transformer.cjs');
const { mergeOptions } = require('../core/options.cjs');
const { log, getRelativePath } = require('../core/utils.cjs');

function oobeeAngularPlugin(options = {}) {
    const mergedOptions = mergeOptions(options);

    return function angularWebpackPlugin(config) {
        if (!mergedOptions.enabled) return config;

        if (!config.module) config.module = {};
        if (!config.module.rules) config.module.rules = [];

        config.module.rules.unshift({
            test: /\.(tsx|jsx|ts|js)$/,
            exclude: /node_modules/,
            use: [
                {
                    loader: require.resolve('../adapters/webpack.cjs'),
                    options: mergedOptions
                }
            ]
        });

        return config;
    };
}

function webpackLoader(source) {
    const mergedOptions = mergeOptions({});

    if (!mergedOptions.enabled) return source;

    const filePath = this.resourcePath;
    if (!shouldTransform(filePath, mergedOptions)) return source;

    log(`Transforming (angular): ${getRelativePath(filePath)}`, mergedOptions.verbose);

    try {
        return injectDNA(source, filePath, mergedOptions);
    } catch (error) {
        console.error(`[oobee-genome] Error transforming ${filePath}:`, error);
        return source;
    }
}

module.exports = oobeeAngularPlugin;
module.exports.default = oobeeAngularPlugin;
module.exports.webpackLoader = webpackLoader;
