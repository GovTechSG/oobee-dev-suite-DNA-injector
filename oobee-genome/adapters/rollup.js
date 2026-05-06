import { injectDNA, shouldTransform } from '../core/transformer.js';
import { mergeOptions } from '../core/options.js';
import { log, getRelativePath } from '../core/utils.js';

function oobeeRollupPlugin(options = {}) {
    const mergedOptions = mergeOptions(options);

    return {
        name: 'oobee-injector',
        enforce: 'pre',
        transform(code, id) {
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
