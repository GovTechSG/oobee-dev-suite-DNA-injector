import { injectDNA, shouldTransform } from '../core/transformer.js';
import { mergeOptions } from '../core/options.js';
import { isDevelopmentBuild } from '../core/environment.js';
import { log, getRelativePath } from '../core/utils.js';

function oobeeWebpackLoader(options = {}) {
    const mergedOptions = mergeOptions(options);
    // Fail-closed dev gate — see rollup.js for the rationale. The Next.js
    // adapter already re-checks webpack's authoritative `options.dev`
    // before registering the loader, but a bare webpack consumer who wires
    // this loader directly bypasses that check, so gate here as well.
    const enabledForDev = isDevelopmentBuild();

    return function loader(source) {
        if (!enabledForDev) return source;
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
