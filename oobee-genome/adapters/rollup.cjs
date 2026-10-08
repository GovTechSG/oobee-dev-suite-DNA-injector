const { injectDNA, shouldTransform } = require('../core/transformer.cjs');
const { mergeOptions } = require('../core/options.cjs');
const { isDevelopmentBuild } = require('../core/environment.cjs');
const { log, getRelativePath } = require('../core/utils.cjs');

function oobeeRollupPlugin(options = {}) {
    const mergedOptions = mergeOptions(options);
    // Fail-closed dev gate. See rollup.js for the rationale — same defense
    // in the CJS twin so `require('oobee-genome/rollup')` consumers get the
    // same protection as `import` consumers.
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

module.exports = oobeeRollupPlugin;
module.exports.default = oobeeRollupPlugin;
