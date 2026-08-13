import type { OobeeOptions } from '../core/options';

/**
 * Returns an Angular webpack config extender that injects the oobee loader.
 * Pass the returned function to `customWebpackConfig.configCallback` in your
 * `angular.json` builder options.
 */
export declare function oobeeAngularPlugin(
    options?: OobeeOptions
): (config: any) => any;

export default oobeeAngularPlugin;
