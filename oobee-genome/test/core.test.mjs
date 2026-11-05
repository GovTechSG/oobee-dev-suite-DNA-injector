// core/environment, core/options, core/utils: ESM and CJS builds must agree.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { withEnv, DEV, FORCE } from './helpers.mjs';

const require = createRequire(import.meta.url);
const envEsm = await import('../core/environment.js');
const envCjs = require('../core/environment.cjs');
const optEsm = await import('../core/options.js');
const optCjs = require('../core/options.cjs');
const utilEsm = await import('../core/utils.js');
const utilCjs = require('../core/utils.cjs');

for (const [label, env] of [['esm', envEsm], ['cjs', envCjs]]) {
    describe(`isDevelopmentBuild (${label})`, () => {
        const gate = (e, mode) => withEnv(e, () => env.isDevelopmentBuild(mode));

        test('only NODE_ENV=development enables without a bundler mode', () => {
            assert.equal(gate(DEV), true);
            assert.equal(gate({}), false);
            assert.equal(gate({ NODE_ENV: 'production' }), false);
            assert.equal(gate({ NODE_ENV: 'test' }), false);
            assert.equal(gate({ NODE_ENV: 'DEVELOPMENT' }), true);
        });

        test('bundler mode is authoritative', () => {
            assert.equal(gate({}, 'development'), true);
            assert.equal(gate({ NODE_ENV: 'development' }, 'production'), false);
            assert.equal(gate({ NODE_ENV: 'development' }, 'none'), false);
            assert.equal(gate({ NODE_ENV: 'production' }, 'development'), false);
        });

        test('force override needs both keys', () => {
            assert.equal(gate({ NODE_ENV: 'production', ...FORCE }), true);
            assert.equal(gate({ NODE_ENV: 'production', OOBEE_DNA_FORCE: '1' }), false);
            assert.equal(gate({ NODE_ENV: 'production', OOBEE_DNA_FORCE_ACK: FORCE.OOBEE_DNA_FORCE_ACK }), false);
            assert.equal(gate({ NODE_ENV: 'production', OOBEE_DNA_FORCE: 'true', OOBEE_DNA_FORCE_ACK: FORCE.OOBEE_DNA_FORCE_ACK }), false);
        });

        test('force never beats a bundler production mode', () => {
            assert.equal(gate({ ...FORCE }, 'production'), false);
        });

        test('Next phase, Vercel and CI signals beat the force override', () => {
            for (const e of [
                { NEXT_PHASE: 'phase-production-build' },
                { NEXT_PHASE: 'phase-production-server' },
                { VERCEL_ENV: 'production' },
                { VERCEL_ENV: 'preview' },
                { VERCEL_ENV: 'PREVIEW' },
                { CI: 'true' },
                { CONTINUOUS_INTEGRATION: '1' },
            ]) {
                assert.equal(gate({ ...DEV, ...FORCE, ...e }), false, JSON.stringify(e));
            }
        });

        test('non-production Next phase and Vercel development are fine', () => {
            assert.equal(gate({ ...DEV, NEXT_PHASE: 'phase-development-server' }), true);
            assert.equal(gate({ ...DEV, VERCEL_ENV: 'development' }), true);
        });

        test('CI flag spellings', () => {
            for (const v of ['', 'false', 'FALSE', '0', ' 0 ']) assert.equal(gate({ ...DEV, CI: v }), true, `CI=${JSON.stringify(v)}`);
            for (const v of ['true', 'True', '1', 'yes', '12345']) assert.equal(gate({ ...DEV, CI: v }), false, `CI=${v}`);
        });
    });
}

for (const [label, opt] of [['esm', optEsm], ['cjs', optCjs]]) {
    describe(`options (${label})`, () => {
        test('defaults', () => {
            const d = opt.DEFAULT_OPTIONS;
            assert.deepEqual(d.blacklist, []);
            assert.equal(d.attributePrefix, 'data-oobee');
            assert.equal(d.pathRoot, '.');
            assert.equal(d.enabled, true);
            assert.equal(d.inheritChildren, true);
            assert.equal(d.verbose, false);
            assert.ok(d.includePatterns.some((p) => p.test('a.vue')));
            for (const f of ['a.d.ts', 'a.spec.tsx', 'a.test.jsx', 'node_modules/x.js']) {
                assert.ok(d.excludePatterns.some((p) => p.test(f)), f);
            }
        });

        test('mergeOptions overrides scalars and arrays', () => {
            const blacklist = ['Foo'];
            const includePatterns = [/\.x$/];
            const excludePatterns = [/y/];
            const m = opt.mergeOptions({ blacklist, includePatterns, excludePatterns, verbose: true, inheritChildren: false });
            assert.equal(m.blacklist, blacklist);
            assert.equal(m.includePatterns, includePatterns);
            assert.equal(m.excludePatterns, excludePatterns);
            assert.equal(m.verbose, true);
            assert.equal(m.inheritChildren, false);
        });

        test('mergeOptions falls back to defaults and does not mutate them', () => {
            const m = opt.mergeOptions();
            assert.deepEqual(m, opt.DEFAULT_OPTIONS);
            m.blacklist = ['x'];
            assert.deepEqual(opt.DEFAULT_OPTIONS.blacklist, []);
        });
    });
}

for (const [label, util] of [['esm', utilEsm], ['cjs', utilCjs]]) {
    describe(`utils (${label})`, () => {
        test('getRelativePath defaults to cwd and accepts a root', () => {
            assert.equal(util.getRelativePath(path.join(process.cwd(), 'a', 'b.js')), path.join('a', 'b.js'));
            assert.equal(util.getRelativePath('/r/a/b.js', '/r'), path.join('a', 'b.js'));
        });

        test('log prints only when verbose', () => {
            const calls = [];
            const orig = console.log;
            console.log = (...a) => calls.push(a.join(' '));
            try {
                util.log('quiet');
                util.log('quiet too', false);
                util.log('loud', true);
            } finally {
                console.log = orig;
            }
            assert.deepEqual(calls, ['[oobee-genome] loud']);
        });

        test('legacy regex-era helpers are gone', () => {
            for (const name of ['normalizePath', 'isComponentFile', 'isHtmlFile', 'detectBundler']) {
                assert.equal(util[name], undefined, name);
            }
        });
    });
}

test('esm and cjs expose the same names', () => {
    assert.deepEqual(Object.keys(utilEsm).sort(), Object.keys(utilCjs).sort());
    assert.deepEqual(Object.keys(optEsm).sort(), Object.keys(optCjs).sort());
    assert.deepEqual(Object.keys(envEsm).sort(), Object.keys(envCjs).sort());
});
