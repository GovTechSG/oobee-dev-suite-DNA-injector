import { mergeOptions } from '../core/options.js';
import { log } from '../core/utils.js';

// Force-disable the DNA injector unless we can *positively* confirm we are
// running a Next.js dev server. The transform embeds source-location
// metadata (`data-oobee-*`) into every element it touches, which is useful
// only in local development and undesirable in any shipped artifact.
//
// The old gate compared `process.env.NODE_ENV === 'production'` exactly and
// treated everything else (including 'staging', 'Production', unset, or the
// common CI pattern of NODE_ENV=development-for-devDeps-install) as "dev",
// which failed *open* on the very common misconfigurations. It also honored
// an unconditional `OOBEE_DNA_FORCE=1` override.
//
// The new logic fails *closed*: it only reports "dev" when NODE_ENV is the
// exact literal 'development' (case-insensitive) AND no ambient
// production-build signal is present (NEXT_PHASE=phase-production-build,
// VERCEL_ENV=production/preview, CI=true). The webpack callback below has
// its own, authoritative `options.dev` check as the real load-bearing gate.
//
// OOBEE_DNA_FORCE is now a *two-key* opt-in: it only takes effect when both
// OOBEE_DNA_FORCE=1 AND OOBEE_DNA_FORCE_ACK=i-understand-this-leaks-paths
// are set, so a forgotten env var in staging cannot silently re-enable the
// injector without a deliberate acknowledgement.
function isDevelopmentBuild() {
    const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
    const nextPhase = String(process.env.NEXT_PHASE || '');
    const vercelEnv = String(process.env.VERCEL_ENV || '').toLowerCase();

    if (nextPhase === 'phase-production-build' || nextPhase === 'phase-production-server') return false;
    if (vercelEnv === 'production' || vercelEnv === 'preview') return false;
    if (process.env.CI === 'true' || process.env.CI === '1') return false;

    if (
        process.env.OOBEE_DNA_FORCE === '1' &&
        process.env.OOBEE_DNA_FORCE_ACK === 'i-understand-this-leaks-paths'
    ) {
        return true;
    }

    return nodeEnv === 'development';
}

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
