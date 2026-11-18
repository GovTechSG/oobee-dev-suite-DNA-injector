import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServer } from '../bin/oobee-genome.js';

const CLI = new URL('../bin/oobee-genome.js', import.meta.url).pathname;

describe('oobee-genome serve', () => {
    let dir, server, base;
    before(async () => {
        dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'oobee-cli-')));
        fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html><head><title>t</title></head><body>\n  <main><button>Go</button></main>\n  <script src="app.js"></script>\n</body></html>');
        fs.writeFileSync(path.join(dir, 'app.js'), "const b = document.createElement('div');\ndocument.body.append(b);\n");
        fs.writeFileSync(path.join(dir, 'style.css'), 'body{color:red}');
        fs.writeFileSync(path.join(dir, '.secret'), 'x');
        fs.mkdirSync(path.join(dir, 'node_modules/lib'), { recursive: true });
        fs.writeFileSync(path.join(dir, 'node_modules/lib/i.js'), "document.createElement('p');");
        server = createServer({ dir });
        await new Promise((r) => server.listen(0, '127.0.0.1', r));
        base = `http://127.0.0.1:${server.address().port}`;
    });
    after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

    const get = (p) => fetch(base + p);

    test('HTML is tagged with project-relative path, line and column; script is not', async () => {
        const html = await (await get('/')).text();
        assert.match(html, /<main data-oobee-path="index.html" data-oobee-line="2" data-oobee-column="3">/);
        assert.match(html, /<button data-oobee-path="index.html" data-oobee-line="2" data-oobee-column="9">/);
        assert.doesNotMatch(html, /<script data-oobee/);
        assert.ok(!html.includes(dir), 'no absolute path leaks into the DOM');
    });

    test('runtime is injected and served so runtime-built DOM can inherit tags', async () => {
        const html = await (await get('/index.html')).text();
        assert.match(html, /import \{ oobeeInherit \} from '\/__oobee\/runtime.js'/);
        const rt = await get('/__oobee/runtime.js');
        assert.equal(rt.status, 200);
        assert.match(await rt.text(), /oobeeInherit/);
    });

    test('JS files are tagged; node_modules, css and other files pass through untouched', async () => {
        assert.match(await (await get('/app.js')).text(), /setAttribute\('data-oobee-path', "app.js"\)|data-oobee-path/);
        assert.equal(await (await get('/node_modules/lib/i.js')).text(), "document.createElement('p');");
        assert.equal(await (await get('/style.css')).text(), 'body{color:red}');
    });

    test('blocks traversal and dotfiles, 404s unknown paths, rejects non-GET', async () => {
        assert.equal((await get('/.secret')).status, 404);
        assert.equal((await get('/%2e%2e/%2e%2e/etc/passwd')).status, 404);
        assert.equal((await get('/nope.html')).status, 404);
        assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
    });

    test('a file that cannot be parsed is served unchanged instead of failing the page', async () => {
        fs.writeFileSync(path.join(dir, 'bad.js'), 'const = ;');
        assert.equal(await (await get('/bad.js')).text(), 'const = ;');
    });
});

describe('oobee-genome CLI gate', () => {
    const run = (args, env = {}) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: { PATH: process.env.PATH, ...env }, timeout: 10000 });
    test('refuses to run under CI', () => {
        const r = run(['serve', '.', '--port', '0'], { CI: 'true' });
        assert.equal(r.status, 1);
        assert.match(r.stderr, /Refusing to run/);
    });
    test('refuses under NODE_ENV=production, but needs no NODE_ENV in a normal dev shell', () => {
        assert.equal(run(['serve', '.', '--port', '0'], { NODE_ENV: 'production' }).status, 1);
        const ok = spawnSync(process.execPath, [CLI, 'serve', '.', '--port', '0'], { encoding: 'utf8', env: { PATH: process.env.PATH }, timeout: 1500, killSignal: 'SIGKILL' });
        assert.match(ok.stdout, /Serving .* with source tracking/);
    });
    test('unknown command and bad port exit non-zero', () => {
        assert.equal(run(['bogus']).status, 2);
        assert.equal(run(['serve', '--port', 'abc']).status, 2);
    });
});
