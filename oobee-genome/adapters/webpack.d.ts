import type { OobeeOptions } from '../core/options';

/**
 * Webpack loader function that injects `data-oobee-*` source-location
 * attributes into every JSX/HTML element at build time.
 *
 * Pass it via `loader: require.resolve('@govtechsg/oobee-genome/adapters/webpack')`.
 */
export declare function oobeeWebpackLoader(this: any, source: string): string;

export default oobeeWebpackLoader;
