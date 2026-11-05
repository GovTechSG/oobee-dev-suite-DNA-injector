// In-process adapter tests (the child-process gate tests in adapters.test.mjs
// cannot be measured for coverage). Covers option handling, file filtering,
// error paths and the non-transform branches of every adapter, ESM and CJS.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { withEnv, DEV, tmpDir, writeTmp } from './helpers.mjs';

const require = createRequire(import.meta.url);
const root = process.cwd();
const at = (rel) => path.join(root, rel);
const SRC = 'const A = () => <div />;';
const BAD = 'const A = () => <div;';

const load = {
    vite: async (esm) => (esm ? (await import('../adapters/vite.js')) : require('../adapters/vite.cjs')),
    rollup: async (esm) => (esm ? (await import('../adapters/rollup.js')) : require('../adapters/rollup.cjs')),
    webpack: async (esm) => (esm ? (await import('../adapters/webpack.js')) : require('../adapters/webpack.cjs')),
    esbuild: async (esm) => (esm ? (await import('../adapters/esbuild.js')) : require('../adapters/esbuild.cjs')),
    angular: async (esm) => (esm ? (await import('../adapters/angular.js')) : require('../adapters/angular.cjs')),
    next: async (esm) => (esm ? (await import('../adapters/next.js')) : require('../adapters/next.cjs')),
};
const fnOf = (m, name) => (esm) => (esm ? m.default ?? m[name] : m.default ?? m[name] ?? m);

// Silence expected console.error / console.log from adapters while asserting on them.
async function capture(fn) {
    const logs = [], errors = [];
    const [ol, oe] = [console.log, console.error];
    console.log = (...a) => logs.push(a.join(' '));
    console.error = (...a) => errors.push(a.join(' '));
    try { return { result: await fn(), logs, errors }; } finally { console.log = ol; console.error = oe; }
}

for (const esm of [true, false]) {
    const tag = esm ? 'esm' : 'cjs';

    describe(`vite (${tag})`, () => {
        test('transforms source in dev and returns code with null map', async () => {
            const m = await load.vite(esm);
            const p = (m.oobeeVitePlugin ?? m.default)();
            assert.equal(p.name, 'oobee-injector');
            assert.equal(p.enforce, 'pre');
            const r = withEnv(DEV, () => p.transform(SRC, at('src/A.jsx')));
            assert.match(r.code, /data-oobee-path="src\/A.jsx"/);
            assert.equal(r.map, null);
        });
        test('skips when disabled, unmatched, or non-dev', async () => {
            const m = await load.vite(esm);
            assert.equal(withEnv(DEV, () => m.default({ enabled: false }).transform(SRC, at('src/A.jsx'))), null);
            assert.equal(withEnv(DEV, () => m.default().transform(SRC, at('src/A.css'))), null);
            assert.equal(withEnv(DEV, () => m.default().transform(SRC, at('node_modules/x/A.jsx'))), null);
            assert.equal(withEnv({ NODE_ENV: 'production' }, () => m.default().transform(SRC, at('src/A.jsx'))), null);
        });
        test('logs when verbose, and reports a transform error without throwing', async () => {
            const m = await load.vite(esm);
            const { result, logs, errors } = await capture(() => withEnv(DEV, () => m.default({ verbose: true }).transform(BAD, at('src/A.jsx'))));
            assert.equal(result, null);
            assert.ok(logs.some((l) => l.includes('Transforming:')));
            assert.ok(errors.some((e) => e.includes('Error transforming')));
        });
    });

    describe(`rollup (${tag})`, () => {
        test('transforms in dev; gate is read when the plugin is created', async () => {
            const m = await load.rollup(esm);
            const make = m.oobeeRollupPlugin ?? m.default;
            const p = withEnv(DEV, () => make());
            assert.match(p.transform(SRC, at('src/A.jsx')).code, /data-oobee-path/);
            const off = withEnv({ NODE_ENV: 'production' }, () => make());
            assert.equal(off.transform(SRC, at('src/A.jsx')), null);
        });
        test('skips disabled and unmatched files; surfaces errors safely', async () => {
            const m = await load.rollup(esm);
            const make = m.default;
            assert.equal(withEnv(DEV, () => make({ enabled: false }).transform(SRC, at('src/A.jsx'))), null);
            assert.equal(withEnv(DEV, () => make().transform(SRC, at('src/A.txt'))), null);
            const { result, errors, logs } = await capture(() => withEnv(DEV, () => make({ verbose: true }).transform(BAD, at('src/A.jsx'))));
            assert.equal(result, null);
            assert.ok(errors.some((e) => e.includes('Error transforming')));
            assert.ok(logs.some((l) => l.includes('Transforming (rollup)')));
        });
    });

    describe(`webpack loader (${tag})`, () => {
        const ctx = (over = {}) => ({ mode: 'development', resourcePath: at('src/A.jsx'), ...over });
        // ESM exports a factory (options) => loader; CJS exports the loader itself
        // and reads options from this.getOptions(), as webpack calls it.
        const build = (m) => (esm
            ? (opts) => m.oobeeWebpackLoader(opts)
            : (opts = {}) => function (src) { return m.call({ ...this, getOptions: () => opts }, src); });
        test('transforms in development mode', async () => {
            const m = await load.webpack(esm);
            const out = withEnv({}, () => build(m)().call(ctx(), SRC));
            assert.match(out, /data-oobee-path/);
        });
        test('returns source untouched for disabled, unmatched and broken input', async () => {
            const m = await load.webpack(esm);
            const make = build(m);
            assert.equal(withEnv({}, () => make({ enabled: false }).call(ctx(), SRC)), SRC);
            assert.equal(withEnv({}, () => make().call(ctx({ resourcePath: at('src/A.css') }), SRC)), SRC);
            const { result, errors, logs } = await capture(() => withEnv({}, () => make({ verbose: true }).call(ctx(), BAD)));
            assert.equal(result, BAD);
            assert.ok(errors.some((e) => e.includes('Error transforming')));
            assert.ok(logs.some((l) => l.includes('Transforming (webpack)')));
        });
    });

    describe(`esbuild (${tag})`, () => {
        const run = async (m, opts, file) => {
            let cb, filter;
            (m.default ?? m.oobeeEsbuildPlugin)(opts).setup({ onLoad: (f, fn) => { filter = f.filter; cb = fn; } });
            return { filter, out: await cb({ path: file }) };
        };
        test('registers a filter and returns contents with the right loader per extension', async () => {
            const m = await load.esbuild(esm);
            const dir = tmpDir();
            const cases = [['a.tsx', 'tsx'], ['a.jsx', 'jsx'], ['a.js', 'js'], ['a.ts', 'ts'], ['a.html', 'text'], ['a.vue', 'jsx']];
            for (const [name, loader] of cases) {
                const content = name.endsWith('.html') ? '<div></div>' : name.endsWith('.vue') ? '<template><div /></template>' : name.endsWith('.ts') ? 'export const x: number = 1;' : SRC;
                const file = writeTmp(dir, name, content);
                const { filter, out } = await withEnv(DEV, () => run(m, { includePatterns: [/\.(ts|tsx|js|jsx|vue|html)$/], excludePatterns: [] }, file));
                assert.ok(filter.test('x.tsx') && !filter.test('x.css'));
                assert.equal(out.loader, loader, name);
                assert.equal(typeof out.contents, 'string');
            }
        });
        test('returns null when disabled, non-dev, unmatched, or unreadable', async () => {
            const m = await load.esbuild(esm);
            const dir = tmpDir();
            const file = writeTmp(dir, 'A.jsx', SRC);
            assert.equal((await withEnv(DEV, () => run(m, { enabled: false, excludePatterns: [] }, file))).out, null);
            assert.equal((await withEnv({ NODE_ENV: 'production' }, () => run(m, { excludePatterns: [] }, file))).out, null);
            assert.equal((await withEnv(DEV, () => run(m, { excludePatterns: [] }, writeTmp(dir, 'A.css', 'x')))).out, null);
            assert.equal((await withEnv(DEV, () => run(m, {}, writeTmp(dir, 'node_modules/p/A.jsx', SRC)))).out, null);
            const { result, errors } = await capture(() => withEnv(DEV, () => run(m, { excludePatterns: [] }, path.join(dir, 'missing.jsx'))));
            assert.equal(result.out, null);
            assert.ok(errors.some((e) => e.includes('Error transforming')));
        });
        test('verbose logs the file', async () => {
            const m = await load.esbuild(esm);
            const file = writeTmp(tmpDir(), 'V.jsx', SRC);
            const { logs } = await capture(() => withEnv(DEV, () => run(m, { verbose: true, excludePatterns: [] }, file)));
            assert.ok(logs.some((l) => l.includes('Transforming (esbuild)')));
        });
    });

    describe(`angular (${tag})`, () => {
        test('registers a loader rule at the front of existing rules', async () => {
            const m = await load.angular(esm);
            const config = withEnv({}, () => m.default()({ mode: 'development', module: { rules: [{ test: /x/ }] } }));
            assert.equal(config.module.rules.length, 2);
            assert.match(String(config.module.rules[0].test), /tsx\|jsx\|ts\|js/);
            assert.ok(config.module.rules[0].use[0].loader.endsWith(esm ? 'webpack.js' : 'webpack.cjs'));
        });
        test('creates module/rules when absent and leaves non-dev or disabled configs alone', async () => {
            const m = await load.angular(esm);
            const created = withEnv({}, () => m.default()({ mode: 'development' }));
            assert.equal(created.module.rules.length, 1);
            const noRules = withEnv({}, () => m.default()({ mode: 'development', module: {} }));
            assert.equal(noRules.module.rules.length, 1);
            const prod = { mode: 'production' };
            assert.equal(withEnv(DEV, () => m.default()(prod)), prod);
            assert.equal(prod.module, undefined);
            const off = { mode: 'development' };
            assert.equal(withEnv({}, () => m.default({ enabled: false })(off)), off);
            assert.equal(off.module, undefined);
        });
        test('standalone webpackLoader transforms, skips, and survives errors', async () => {
            const m = await load.angular(esm);
            const loader = m.webpackLoader;
            const ctx = (o = {}) => ({ mode: 'development', resourcePath: at('src/A.jsx'), ...o });
            assert.match(withEnv({}, () => loader.call(ctx(), SRC)), /data-oobee-path/);
            assert.equal(withEnv({}, () => loader.call(ctx({ mode: 'production' }), SRC)), SRC);
            assert.equal(withEnv({}, () => loader.call(ctx({ resourcePath: at('src/A.css') }), SRC)), SRC);
            const { result, errors } = await capture(() => withEnv({}, () => loader.call(ctx(), BAD)));
            assert.equal(result, BAD);
            assert.ok(errors.some((e) => e.includes('Error transforming')));
        });
    });

    describe(`next (${tag})`, () => {
        const cfg = () => ({ module: { rules: [] } });
        test('returns the config unchanged outside development or when disabled', async () => {
            const m = await load.next(esm);
            const base = { reactStrictMode: true };
            assert.equal(withEnv({ NODE_ENV: 'production' }, () => m.withOobeeDNA(base)), base);
            assert.equal(withEnv(DEV, () => m.withOobeeDNA(base, { enabled: false })), base);
            const { logs } = await capture(() => withEnv({ NODE_ENV: 'production' }, () => m.withOobeeDNA(base, { verbose: true })));
            assert.ok(logs.some((l) => l.includes('auto-disabled')));
            const d = await capture(() => withEnv(DEV, () => m.withOobeeDNA(base, { enabled: false, verbose: true })));
            assert.ok(d.logs.some((l) => l.includes('disabled')));
        });
        test('keeps user config keys and registers a pre-loader only for dev webpack builds', async () => {
            const m = await load.next(esm);
            const wrapped = withEnv(DEV, () => m.withOobeeDNA({ reactStrictMode: true }, { verbose: true }));
            assert.equal(wrapped.reactStrictMode, true);
            const dev = cfg();
            wrapped.webpack(dev, { dev: true });
            assert.equal(dev.module.rules.length, 1);
            assert.equal(dev.module.rules[0].enforce, 'pre');
            assert.ok(dev.module.rules[0].test.test('a.tsx'));
            assert.ok(dev.module.rules[0].exclude.test('node_modules/x.js'));
            const prod = cfg();
            wrapped.webpack(prod, { dev: false });
            assert.equal(prod.module.rules.length, 0);
            const noOpts = cfg();
            wrapped.webpack(noOpts);
            assert.equal(noOpts.module.rules.length, 1);
        });
        test('chains the user webpack function in every branch', async () => {
            const m = await load.next(esm);
            const seen = [];
            const wrapped = withEnv(DEV, () => m.withOobeeDNA({ webpack: (c, o) => { seen.push(o.dev); c.touched = true; return c; } }));
            assert.equal(wrapped.webpack(cfg(), { dev: true }).touched, true);
            assert.equal(wrapped.webpack(cfg(), { dev: false }).touched, true);
            assert.deepEqual(seen, [true, false]);
        });
        test('createNextPlugin exposes its enablement and webpack hook', async () => {
            const m = await load.next(esm);
            const on = withEnv(DEV, () => m.createNextPlugin());
            assert.equal(on.name, 'oobee-dna-next-plugin');
            assert.equal(on.enabled, true);
            const c = cfg();
            on.webpack(c, { dev: true });
            assert.equal(c.module.rules.length, 1);
            const c2 = cfg();
            on.webpack(c2, { dev: false });
            assert.equal(c2.module.rules.length, 0);
            const c3 = cfg();
            on.webpack(c3);
            assert.equal(c3.module.rules.length, 1);
            const off = withEnv({ NODE_ENV: 'production' }, () => m.createNextPlugin());
            assert.equal(off.enabled, false);
            const c4 = cfg();
            off.webpack(c4, { dev: true });
            assert.equal(c4.module.rules.length, 0);
            const disabled = withEnv(DEV, () => m.createNextPlugin({ enabled: false }));
            assert.equal(disabled.enabled, false);
            const c5 = cfg();
            disabled.webpack(c5, { dev: true });
            assert.equal(c5.module.rules.length, 0);
        });
    });
}

describe('package entry points', () => {
    test('esm index exposes adapters, core and helpers', async () => {
        const idx = await import('../index.js');
        for (const k of ['vite', 'webpack', 'esbuild', 'rollup', 'angular', 'next']) assert.ok(idx.adapters[k], k);
        assert.equal(typeof idx.core.transformer.injectDNA, 'function');
        assert.equal(typeof idx.shouldTransform, 'function');
        assert.equal(typeof idx.mergeOptions, 'function');
        assert.equal(idx.default, idx.vitePlugin);
    });
    test('cjs index exposes the same surface', () => {
        const idx = require('../index.cjs');
        for (const k of ['vite', 'webpack', 'esbuild', 'rollup', 'angular', 'next']) assert.ok(idx.adapters[k], k);
        assert.equal(typeof idx.core.transformer.injectDNA, 'function');
        assert.equal(typeof idx.shouldTransform, 'function');
        assert.equal(typeof idx.mergeOptions, 'function');
    });
    test('package.json exports resolve for every subpath', () => {
        const pkg = JSON.parse(fs.readFileSync(at('package.json'), 'utf8'));
        for (const [sub, target] of Object.entries(pkg.exports)) {
            for (const kind of ['import', 'require', 'types']) {
                if (target[kind]) assert.ok(fs.existsSync(at(target[kind])), `${sub} -> ${target[kind]}`);
            }
        }
    });
});
