import type { OobeeOptions } from '../core/options';

/** Minimal Rollup plugin interface — compatible with rollup's `Plugin` type. */
export interface OobeeRollupPlugin {
    name: string;
    enforce: 'pre';
    transform(code: string, id: string): { code: string; map: null } | null;
}

/**
 * Rollup plugin that injects `data-oobee-*` source-location attributes into
 * every JSX/HTML element at build time.
 */
export declare function oobeeRollupPlugin(options?: OobeeOptions): OobeeRollupPlugin;

export default oobeeRollupPlugin;
