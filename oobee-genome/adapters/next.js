import { mergeOptions } from '../core/options.js';
import { log } from '../core/utils.js';

// Force-disable the DNA injector when Next.js is doing a production build.
// The transform embeds `data-oobee-path="<absolute filesystem path>"` into
// every element it touches (see transformer.js:injectDNA). Shipping that to
// end users leaks the developer/CI host username and internal directory
// layout. Consumers can still opt into a production build explicitly by
// setting OOBEE_DNA_FORCE=1 (rare — mostly useful for staging).
function isProductionBuild() {
    if (process.env.OOBEE_DNA_FORCE === '1') return false;
    return process.env.NODE_ENV === 'production';
}

function withOobeeDNA(nextConfig = {}, dnaOptions = {}) {
    const mergedOptions = mergeOptions(dnaOptions);

    if (isProductionBuild()) {
        log('DNA injector auto-disabled for production build (NODE_ENV=production)', mergedOptions.verbose);
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
            config.module.rules.push({
                test: /\.(ts|tsx|js|jsx)$/,
                exclude: /node_modules/,
                enforce: 'pre',
                use: [
                    {
                        loader: new URL('../adapters/webpack.js', import.meta.url).pathname,
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
    const disabledForProduction = isProductionBuild();

    return {
        name: 'oobee-dna-next-plugin',
        enabled: mergedOptions.enabled && !disabledForProduction,
        options: mergedOptions,
        webpack: (config) => {
            if (disabledForProduction) return config;
            if (!mergedOptions.enabled) return config;

            config.module.rules.push({
                test: /\.(tsx|jsx)$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: new URL('../adapters/webpack.js', import.meta.url).pathname,
                        options: mergedOptions
                    }
                ]
            });

            return config;
        }
    };
}

export { withOobeeDNA, createNextPlugin };
export default withOobeeDNA;
