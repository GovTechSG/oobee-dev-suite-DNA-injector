const { injectDNA, shouldTransform } = require('../core/transformer.cjs');
const { mergeOptions } = require('../core/options.cjs');
const { log } = require('../core/utils.cjs');

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

module.exports = oobeeVitePlugin;
module.exports.default = oobeeVitePlugin;
module.exports.oobeeVitePlugin = oobeeVitePlugin;
