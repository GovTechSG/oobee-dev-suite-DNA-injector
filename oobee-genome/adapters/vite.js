import { injectDNA, shouldTransform } from '../core/transformer.js';
import { mergeOptions } from '../core/options.js';
import { log } from '../core/utils.js';

function oobeeVitePlugin(options = {}) {
    const mergedOptions = mergeOptions(options);

    return {
        name: 'oobee-injector',
        apply: 'serve',
        enforce: 'pre',
        transform(code, id) {
            if (!mergedOptions.enabled) return null;
            if (!shouldTransform(id, mergedOptions)) return null;

            log(`Transforming: ${id}`, mergedOptions.verbose);

            try {
                const transformedCode = injectDNA(code, id, mergedOptions);
                return { code: transformedCode, map: null };
            } catch (error) {
                console.error(`[oobee-genome] Error transforming ${id}:`, error);
                return null;
            }
        }
    };
}

export default oobeeVitePlugin;
export { oobeeVitePlugin };
