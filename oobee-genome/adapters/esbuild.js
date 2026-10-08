import { injectDNA, shouldTransform } from '../core/transformer.js';
import { mergeOptions } from '../core/options.js';
import { log, getRelativePath } from '../core/utils.js';
import { promises as fs } from 'fs';
import { isDevelopmentBuild } from '../core/environment.js';

function getLoader(filePath) {
    if (filePath.endsWith('.html')) return 'text';
    if (filePath.endsWith('.ts')) return 'ts';
    if (filePath.endsWith('.tsx')) return 'tsx';
    if (filePath.endsWith('.jsx')) return 'jsx';
    if (filePath.endsWith('.js')) return 'js';
    return 'jsx';
}

function oobeeEsbuildPlugin(options = {}) {
    const mergedOptions = mergeOptions(options);
    // esbuild has no dev/prod signal; use the shared fail-closed gate.
    const enabledForDev = isDevelopmentBuild();

    return {
        name: 'oobee-injector',
        setup(build) {
            build.onLoad(
                { filter: /\.(ts|tsx|js|jsx|vue|html)$/ },
                async (args) => {
                    if (!enabledForDev || !mergedOptions.enabled) return null;
                    if (!shouldTransform(args.path, mergedOptions)) return null;

                    log(`Transforming (esbuild): ${getRelativePath(args.path)}`, mergedOptions.verbose);

                    try {
                        const source = await fs.readFile(args.path, 'utf8');
                        const transformed = injectDNA(source, args.path, mergedOptions);

                        return {
                            contents: transformed,
                            loader: getLoader(args.path)
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
