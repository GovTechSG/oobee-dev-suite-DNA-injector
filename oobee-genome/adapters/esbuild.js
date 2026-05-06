import { injectDNA, shouldTransform } from '../core/transformer.js';
import { mergeOptions } from '../core/options.js';
import { log, getRelativePath } from '../core/utils.js';
import { promises as fs } from 'fs';

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

                    log(`Transforming (esbuild): ${getRelativePath(args.path)}`, mergedOptions.verbose);

                    try {
                        const source = await fs.readFile(args.path, 'utf8');
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

export default oobeeEsbuildPlugin;
export { oobeeEsbuildPlugin };
