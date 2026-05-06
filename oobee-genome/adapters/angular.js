import { injectDNA, shouldTransform } from '../core/transformer.js';
import { mergeOptions } from '../core/options.js';
import { log, getRelativePath } from '../core/utils.js';

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
                    loader: new URL('../adapters/webpack.js', import.meta.url).pathname,
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

export default oobeeAngularPlugin;
export { oobeeAngularPlugin, webpackLoader };
