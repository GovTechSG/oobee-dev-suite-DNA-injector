// Adapters must inject in development and stay inert in production/CI builds.
// Each case runs in a child process because the gate reads process.env.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = 'const A = () => <div />;';

const probes = {
    'webpack (esm)': `const { default: l } = await import('./adapters/webpack.js');
        out = l().call({ resourcePath: process.cwd() + '/src/A.jsx', getOptions: () => ({}) }, SRC);`,
    'webpack (cjs)': `const l = require('./adapters/webpack.cjs');
        out = l.call({ resourcePath: process.cwd() + '/src/A.jsx', getOptions: () => ({}) }, SRC);`,
    'rollup (esm)': `const { default: p } = await import('./adapters/rollup.js');
        out = p().transform(SRC, process.cwd() + '/src/A.jsx')?.code ?? SRC;`,
    'rollup (cjs)': `const p = require('./adapters/rollup.cjs');
        out = p().transform(SRC, process.cwd() + '/src/A.jsx')?.code ?? SRC;`,
    'esbuild (esm)': `const { default: p } = await import('./adapters/esbuild.js');
        let cb; p().setup({ onLoad: (_f, fn) => (cb = fn) });
        const fs = await import('node:fs'); const f = process.cwd() + '/test/.tmp-A.jsx';
        fs.writeFileSync(f, SRC); out = (await cb({ path: f }))?.contents ?? SRC; fs.unlinkSync(f);`,
    'esbuild (cjs)': `const p = require('./adapters/esbuild.cjs');
        let cb; p().setup({ onLoad: (_f, fn) => (cb = fn) });
        const fs = require('node:fs'); const f = process.cwd() + '/test/.tmp-B.jsx';
        fs.writeFileSync(f, SRC); out = (await cb({ path: f }))?.contents ?? SRC; fs.unlinkSync(f);`,
    'next withOobeeDNA (esm)': `const { withOobeeDNA } = await import('./adapters/next.js');
        const cfg = withOobeeDNA({});
        const c = { module: { rules: [] } };
        cfg.webpack ? cfg.webpack(c, { dev: true }) : null;
        out = c.module.rules.length ? 'data-oobee-path' : SRC;`,
};

const run = (body, env) => {
    const script = `import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
        const SRC = ${JSON.stringify(SRC)}; let out;
        ${body}
        process.stdout.write(String(out).includes('data-oobee-path') ? 'INJECTED' : 'CLEAN');`;
    const clean = { PATH: process.env.PATH, HOME: process.env.HOME };
    return execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: pkg, env: { ...clean, ...env }, encoding: 'utf8' });
};

const envs = [
    ['NODE_ENV=development', { NODE_ENV: 'development' }, 'INJECTED'],
    ['NODE_ENV=production', { NODE_ENV: 'production' }, 'CLEAN'],
    ['NODE_ENV unset', {}, 'CLEAN'],
    ['CI=true even in development', { NODE_ENV: 'development', CI: 'true' }, 'CLEAN'],
    ['two-key force in production', { NODE_ENV: 'production', OOBEE_DNA_FORCE: '1', OOBEE_DNA_FORCE_ACK: 'i-understand-this-leaks-paths' }, 'INJECTED'],
    ['single-key force is ignored', { NODE_ENV: 'production', OOBEE_DNA_FORCE: '1' }, 'CLEAN'],
];

describe('dev-only gate', () => {
    for (const [name, body] of Object.entries(probes)) {
        for (const [label, env, want] of envs) {
            test(`${name}: ${label} -> ${want}`, () => assert.equal(run(body, env), want));
        }
    }

    test('vite plugin only applies to the dev server', async () => {
        const { default: vite } = await import('../adapters/vite.js');
        assert.equal(vite().apply, 'serve');
        assert.equal(require('../adapters/vite.cjs')().apply, 'serve');
    });
});

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
