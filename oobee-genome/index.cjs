const vitePlugin = require('./adapters/vite.cjs');
const webpackAdapter = require('./adapters/webpack.cjs');
const esbuildAdapter = require('./adapters/esbuild.cjs');
const rollupAdapter = require('./adapters/rollup.cjs');
const angularAdapter = require('./adapters/angular.cjs');
const nextAdapter = require('./adapters/next.cjs');

const transformer = require('./core/transformer.cjs');
const options = require('./core/options.cjs');
const utils = require('./core/utils.cjs');

const adapters = {
    vite: vitePlugin,
    webpack: webpackAdapter,
    esbuild: esbuildAdapter,
    rollup: rollupAdapter,
    angular: angularAdapter,
    next: nextAdapter
};

const core = {
    transformer,
    options,
    utils
};

module.exports = {
    default: vitePlugin,
    vitePlugin,
    webpackAdapter,
    esbuildAdapter,
    rollupAdapter,
    angularAdapter,
    nextAdapter,
    adapters,
    core,
    shouldTransform: transformer.shouldTransform,
    mergeOptions: options.mergeOptions
};
