import type { OobeeOptions } from '../core/options';

/** Minimal esbuild plugin interface — compatible with esbuild's `Plugin` type. */
export interface OobeeEsbuildPlugin {
    name: string;
    setup(build: any): void;
}

/**
 * esbuild plugin that injects `data-oobee-*` source-location attributes into
 * every JSX/HTML element at build time.
 */
export declare function oobeeEsbuildPlugin(options?: OobeeOptions): OobeeEsbuildPlugin;

export default oobeeEsbuildPlugin;
