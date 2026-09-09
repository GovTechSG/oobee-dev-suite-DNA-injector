const { mergeOptions } = require('../core/options.cjs');
const { isDevelopmentBuild } = require('../core/environment.cjs');
const { log } = require('../core/utils.cjs');

function withOobeeDNA(nextConfig = {}, dnaOptions = {}) {
    const mergedOptions = mergeOptions(dnaOptions);

    if (!isDevelopmentBuild()) {
        log('DNA injector auto-disabled (build environment is not development)', mergedOptions.verbose);
        return nextConfig;
    }

    if (!mergedOptions.enabled) {
        log('DNA injector is disabled', mergedOptions.verbose);
        return nextConfig;
    }

    log('Enabling DNA injector for Next.js', mergedOptions.verbose);

    return {
        ...nextConfig,
        webpack: (config, options) => {
            // Load-bearing gate: webpack's authoritative `options.dev` signal.
            // Mirrors the ESM twin — even if our env-based check let us in,
            // we do not register the loader against a production webpack pass.
            if (options && options.dev !== true) {
                if (typeof nextConfig.webpack === 'function') {
                    return nextConfig.webpack(config, options);
                }
                return config;
            }

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
    const enabledForDev = isDevelopmentBuild();

    return {
        name: 'oobee-dna-next-plugin',
        enabled: mergedOptions.enabled && enabledForDev,
        options: mergedOptions,
        webpack: (config, ctx) => {
            if (!enabledForDev) return config;
            if (!mergedOptions.enabled) return config;
            if (ctx && ctx.dev !== true) return config;

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
