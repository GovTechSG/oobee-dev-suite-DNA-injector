import { mergeOptions } from '../core/options.js';
import { isDevelopmentBuild } from '../core/environment.js';
import { log } from '../core/utils.js';

// The dev-build detector lives in core/environment.js so every bundler
// adapter (next / rollup / webpack / angular) shares one fail-closed
// definition and cannot drift out of sync. See that file for the exact
// signals it consults and the two-key OOBEE_DNA_FORCE escape hatch.
// The webpack callback below still re-checks webpack's authoritative
// `options.dev` as the load-bearing final gate.

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
            // Load-bearing gate: webpack itself tells us whether this is a
            // dev build (`options.dev === true`) or a production build. Trust
            // that signal over any env-var heuristic — if webpack is not in
            // dev mode we must not register the loader, regardless of what
            // NODE_ENV etc. looked like at the top of this file.
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
