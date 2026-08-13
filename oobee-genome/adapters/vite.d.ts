import type { OobeeOptions } from '../core/options';

/** Minimal Vite plugin interface — compatible with `vite`'s `Plugin` type. */
export interface OobeeVitePlugin {
    name: string;
    apply: 'serve';
    enforce: 'pre';
    transform(code: string, id: string): { code: string; map: null } | null;
}

/**
 * Vite plugin that injects `data-oobee-*` source-location attributes into
 * every JSX/HTML element at dev-server transform time.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { oobeeVitePlugin } from '@govtechsg/oobee-genome/adapters/vite';
 * export default { plugins: [oobeeVitePlugin({ verbose: true })] };
 * ```
 */
export declare function oobeeVitePlugin(options?: OobeeOptions): OobeeVitePlugin;

export default oobeeVitePlugin;
