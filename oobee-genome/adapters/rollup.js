import { injectDNA, shouldTransform } from '../core/transformer.js';
import { mergeOptions } from '../core/options.js';
import { isDevelopmentBuild } from '../core/environment.js';
import { log, getRelativePath } from '../core/utils.js';

function oobeeRollupPlugin(options = {}) {
    const mergedOptions = mergeOptions(options);
    // Fail-closed dev gate. Rollup has no built-in dev/prod signal (unlike
    // Vite's `apply:'serve'` or webpack's `options.dev`), so without this
    // check a consumer who registers the plugin for local debugging and
    // forgets to gate it in their config would ship data-oobee-* metadata
    // into every element of the production bundle.
    const enabledForDev = isDevelopmentBuild();

    return {
        name: 'oobee-injector',
        enforce: 'pre',
        transform(code, id) {
            if (!enabledForDev) return null;
            if (!mergedOptions.enabled) return null;
            if (!shouldTransform(id, mergedOptions)) return null;

            log(`Transforming (rollup): ${getRelativePath(id)}`, mergedOptions.verbose);

            try {
                const transformed = injectDNA(code, id, mergedOptions);
                return {
                    code: transformed,
                    map: null
                };
            } catch (error) {
                console.error(`[oobee-genome] Error transforming ${id}:`, error);
                return null;
            }
        }
    };
}

export default oobeeRollupPlugin;
export { oobeeRollupPlugin };
