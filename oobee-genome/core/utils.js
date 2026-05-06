import { resolve, relative } from 'path';

function normalizePath(filePath) {
    return resolve(filePath);
}

function getRelativePath(filePath, rootPath = process.cwd()) {
    return relative(rootPath, filePath);
}

function isComponentFile(filePath) {
    return /\.(tsx|jsx|vue)$/.test(filePath);
}

function isHtmlFile(filePath) {
    return /\.html$/.test(filePath);
}

function detectBundler() {
    const bundlerEnv = process.env.OOBEE_BUNDLER;
    if (bundlerEnv) return bundlerEnv;

    try {
        const pkg = require(require.resolve('../../../package.json'));
        if (pkg.devDependencies) {
            if (pkg.devDependencies.next) return 'next';
            if (pkg.devDependencies.webpack) return 'webpack';
            if (pkg.devDependencies.vite) return 'vite';
            if (pkg.devDependencies.esbuild) return 'esbuild';
            if (pkg.devDependencies.rollup) return 'rollup';
            if (pkg.devDependencies['@angular/cli']) return 'angular';
        }
    } catch (e) {
        return 'unknown';
    }

    return 'unknown';
}

function log(message, verbose = false) {
    if (verbose) {
        console.log(`[oobee-genome] ${message}`);
    }
}

export {
    normalizePath,
    getRelativePath,
    isComponentFile,
    isHtmlFile,
    detectBundler,
    log
};
