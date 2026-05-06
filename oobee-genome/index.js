import vitePlugin from './adapters/vite.js';
import * as webpackAdapter from './adapters/webpack.js';
import * as esbuildAdapter from './adapters/esbuild.js';
import * as rollupAdapter from './adapters/rollup.js';
import * as angularAdapter from './adapters/angular.js';
import * as nextAdapter from './adapters/next.js';

import * as transformer from './core/transformer.js';
import * as options from './core/options.js';
import * as utils from './core/utils.js';

export default vitePlugin;

export { vitePlugin };
export {
    webpackAdapter,
    esbuildAdapter,
    rollupAdapter,
    angularAdapter,
    nextAdapter
};

export const adapters = {
    vite: vitePlugin,
    webpack: webpackAdapter.default,
    esbuild: esbuildAdapter.default,
    rollup: rollupAdapter.default,
    angular: angularAdapter.default,
    next: nextAdapter.default
};

export const core = {
    transformer,
    options,
    utils
};

export { shouldTransform } from './core/transformer.js';
export { mergeOptions } from './core/options.js';