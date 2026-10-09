import { injectDNA, shouldTransform } from '../core/transformer.js';
import { mergeOptions } from '../core/options.js';
import { isDevelopmentBuild } from '../core/environment.js';
import { log } from '../core/utils.js';

function oobeeVitePlugin(options = {}) {
    const mergedOptions = mergeOptions(options);

    return {
        name: 'oobee-injector',
        apply: 'serve',
        enforce: 'pre',
        transform(code, id) {
            // `apply: 'serve'` only keeps the plugin out of `vite build`; a dev
            // server run with NODE_ENV=production or under CI must not inject.
            // Vite's `--mode` is not passed: `vite --mode staging` is still a dev server.
            if (!isDevelopmentBuild()) return null;
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
