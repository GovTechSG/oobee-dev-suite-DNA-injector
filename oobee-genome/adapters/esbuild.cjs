const { injectDNA, shouldTransform } = require('../core/transformer.cjs');
const { mergeOptions } = require('../core/options.cjs');
const { log } = require('../core/utils.cjs');
const fs = require('fs');

function oobeeEsbuildPlugin(options = {}) {
    const mergedOptions = mergeOptions(options);

    return {
        name: 'oobee-injector',
        setup(build) {
            build.onLoad(
                { filter: /\.(tsx|jsx|vue|html)$/ },
                async (args) => {
                    if (!mergedOptions.enabled) return null;
                    if (!shouldTransform(args.path, mergedOptions)) return null;

                    log(`Transforming (esbuild): ${args.path}`, mergedOptions.verbose);

                    try {
                        const source = await fs.promises.readFile(args.path, 'utf8');
                        const transformed = injectDNA(source, args.path, mergedOptions);

                        return {
                            contents: transformed,
                            loader: args.path.endsWith('.html') ? 'text' : 'jsx'
                        };
                    } catch (error) {
                        console.error(`[oobee-genome] Error transforming ${args.path}:`, error);
                        return null;
                    }
                }
            );
        }
    };
}

module.exports = oobeeEsbuildPlugin;
module.exports.default = oobeeEsbuildPlugin;
