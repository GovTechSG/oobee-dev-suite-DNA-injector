import type { OobeeOptions } from '../core/options';

/**
 * Wraps a Next.js config object to add the oobee webpack loader for dev builds.
 *
 * @example
 * ```js
 * // next.config.oobee.js
 * const { withOobeeDNA } = require('@govtechsg/oobee-genome/adapters/next');
 * module.exports = withOobeeDNA({ reactStrictMode: true }, { verbose: true });
 * ```
 */
export declare function withOobeeDNA(
    nextConfig?: Record<string, any>,
    dnaOptions?: OobeeOptions
): Record<string, any>;

export interface OobeeNextPlugin {
    name: string;
    enabled: boolean;
    options: Required<OobeeOptions>;
    webpack(config: any): any;
}

export declare function createNextPlugin(options?: OobeeOptions): OobeeNextPlugin;
