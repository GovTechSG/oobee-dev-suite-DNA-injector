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
        },
        // Vite serves the entry index.html through this hook, not `transform`.
        transformIndexHtml: {
            order: 'pre',
            handler(html, ctx) {
                if (!isDevelopmentBuild()) return html;
                if (!mergedOptions.enabled) return html;
                const id = (ctx && (ctx.filename || ctx.path)) || 'index.html';
                if (!shouldTransform(id, mergedOptions)) return html;

                log(`Transforming: ${id}`, mergedOptions.verbose);

                try {
                    const transformed = injectDNA(html, id, mergedOptions);
                    if (mergedOptions.inheritChildren === false) return transformed;
                    // Elements created at runtime (innerHTML, library output) never pass through the
                    // transform, so load the runtime from the entry page; it is idempotent.
                    return {
                        html: transformed,
                        tags: [{
                            tag: 'script',
                            attrs: { type: 'module' },
                            children: `import { oobeeInherit } from '@govtechsg/oobee-genome/core/runtime'; oobeeInherit(${JSON.stringify(mergedOptions.attributePrefix)});`,
                            injectTo: 'body'
                        }]
                    };;
                } catch (error) {
                    console.error(`[oobee-genome] Error transforming ${id}:`, error);
                    return html;
                }
            }
        }
    };
}

export default oobeeVitePlugin;
export { oobeeVitePlugin };
