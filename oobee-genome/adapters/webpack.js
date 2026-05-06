import { injectDNA, shouldTransform } from '../core/transformer.js';
import { mergeOptions } from '../core/options.js';
import { log, getRelativePath } from '../core/utils.js';

function oobeeWebpackLoader(options = {}) {
    const mergedOptions = mergeOptions(options);

    return function loader(source) {
        if (!mergedOptions.enabled) return source;

        const filePath = this.resourcePath;
        if (!shouldTransform(filePath, mergedOptions)) return source;

        log(`Transforming (webpack): ${getRelativePath(filePath)}`, mergedOptions.verbose);

        try {
            const transformed = injectDNA(source, filePath, mergedOptions);
            return transformed;
        } catch (error) {
            console.error(`[oobee-genome] Error transforming ${filePath}:`, error);
            return source;
        }
    };
}

export default oobeeWebpackLoader;
export { oobeeWebpackLoader };
