const { mergeOptions } = require('../core/options.cjs');
const { log } = require('../core/utils.cjs');

function withOobeeDNA(nextConfig = {}, dnaOptions = {}) {
    const mergedOptions = mergeOptions(dnaOptions);

    if (!mergedOptions.enabled) {
        log('DNA injector is disabled', mergedOptions.verbose);
        return nextConfig;
    }

    log('Enabling DNA injector for Next.js', mergedOptions.verbose);

    return {
        ...nextConfig,
        webpack: (config, options) => {
            config.module.rules.push({
                test: /\.(ts|tsx|js|jsx)$/,
                exclude: /node_modules/,
                enforce: 'pre',
                use: [
                    {
                        loader: require.resolve('../adapters/webpack.cjs'),
                        options: mergedOptions
                    }
                ]
            });

            if (typeof nextConfig.webpack === 'function') {
                return nextConfig.webpack(config, options);
            }

            return config;
        }
    };
}

function createNextPlugin(options = {}) {
    const mergedOptions = mergeOptions(options);

    return {
        name: 'oobee-dna-next-plugin',
        enabled: mergedOptions.enabled,
        options: mergedOptions,
        webpack: (config) => {
            if (!mergedOptions.enabled) return config;

            config.module.rules.push({
                test: /\.(tsx|jsx)$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: require.resolve('../adapters/webpack.cjs'),
                        options: mergedOptions
                    }
                ]
            });

            return config;
        }
    };
}

module.exports = {
    withOobeeDNA,
    createNextPlugin
};
