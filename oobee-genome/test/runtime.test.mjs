// core/runtime: browser-side inheritance of source-location attributes.
// Run in jsdom; the module is loaded fresh for every case because it keeps
// per-prefix "started" state.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { sleep } from './helpers.mjs';

const require = createRequire(import.meta.url);
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(pkg, 'core/runtime.cjs'), 'utf8');

const P = 'data-oobee';
const tag = (el, line = '1') => {
    el.setAttribute(`${P}-path`, 'src/A.jsx');
    el.setAttribute(`${P}-line`, line);
    el.setAttribute(`${P}-column`, '5');
    return el;
};

// Fresh DOM + fresh module instance. `pass` waits out the settle timer.
function setup(html, { readyState } = {}) {
    const dom = new JSDOM(`<!doctype html><body>${html}</body>`, { runScripts: 'outside-only', pretendToBeVisual: true });
    const { window } = dom;
    if (readyState) Object.defineProperty(window.document, 'readyState', { value: readyState, configurable: true });
    const mod = { exports: {} };
    vm.runInContext(`(function (module, exports) {${source}\n})`, dom.getInternalVMContext())(mod, mod.exports);
    return { window, document: window.document, start: mod.exports.oobeeInherit, mod: mod.exports };
}
const SETTLE = 700;
const get = (el, k) => el.getAttribute(`${P}-${k}`);

describe('oobeeInherit', () => {
    test('exports both a named and a default function', () => {
        const { mod } = setup('');
        assert.equal(typeof mod.oobeeInherit, 'function');
        assert.equal(mod.default, mod.oobeeInherit);
    });

    test('copies the nearest tagged ancestor onto untagged descendants', async () => {
        const { document, start } = setup('<div id="a"><span id="b"><i id="c"></i></span></div><p id="out"></p>');
        tag(document.getElementById('a'), '7');
        start();
        await sleep(SETTLE);
        for (const id of ['b', 'c']) {
            const el = document.getElementById(id);
            assert.equal(get(el, 'path'), 'src/A.jsx', id);
            assert.equal(get(el, 'line'), '7', id);
            assert.equal(get(el, 'column'), '5', id);
            assert.equal(el.getAttribute(`${P}-inherited`), 'true', id);
        }
        const out = document.getElementById('out');
        assert.equal(out.hasAttribute(`${P}-path`), false, 'no tagged ancestor, nothing to copy');
    });

    test('exact tags win and are not marked inherited; nesting uses the closest', async () => {
        const { document, start } = setup('<div id="a"><section id="s"><b id="x"></b></section></div>');
        tag(document.getElementById('a'), '1');
        tag(document.getElementById('s'), '9');
        start();
        await sleep(SETTLE);
        assert.equal(document.getElementById('a').hasAttribute(`${P}-inherited`), false);
        assert.equal(document.getElementById('s').hasAttribute(`${P}-inherited`), false);
        assert.equal(get(document.getElementById('s'), 'line'), '9');
        assert.equal(get(document.getElementById('x'), 'line'), '9');
    });

    test('script, style, noscript and template are never stamped', async () => {
        const { document, start } = setup('<div id="a"><script id="sc"></script><style id="st"></style><noscript id="ns"></noscript><template id="tp"></template><b id="ok"></b></div>');
        tag(document.getElementById('a'));
        start();
        await sleep(SETTLE);
        for (const id of ['sc', 'st', 'ns', 'tp']) assert.equal(document.getElementById(id).hasAttribute(`${P}-path`), false, id);
        assert.ok(document.getElementById('ok').hasAttribute(`${P}-path`));
    });

    test('elements added later are tagged from their parent', async () => {
        const { document, start } = setup('<div id="a"></div>');
        tag(document.getElementById('a'), '3');
        start();
        await sleep(SETTLE);
        const wrap = document.createElement('div');
        wrap.innerHTML = '<span id="late"><em id="deep"></em></span>';
        document.getElementById('a').appendChild(wrap);
        await sleep(50);
        assert.equal(get(document.getElementById('late'), 'line'), '3');
        assert.equal(get(document.getElementById('deep'), 'line'), '3');
    });

    test('a subtree added with its own tag keeps it for its descendants', async () => {
        const { document, start } = setup('<div id="a"></div>');
        tag(document.getElementById('a'), '3');
        start();
        await sleep(SETTLE);
        const own = tag(document.createElement('section'), '40');
        own.innerHTML = '<span id="kid"></span>';
        document.getElementById('a').appendChild(own);
        await sleep(50);
        assert.equal(get(document.getElementById('kid'), 'line'), '40');
    });

    test('portal content appended to body with no tagged ancestor stays untagged', async () => {
        const { document, start } = setup('<div id="a"></div>');
        tag(document.getElementById('a'));
        start();
        await sleep(SETTLE);
        const portal = document.createElement('div');
        portal.innerHTML = '<span id="p"></span>';
        document.body.appendChild(portal);
        await sleep(50);
        assert.equal(document.getElementById('p').hasAttribute(`${P}-path`), false);
    });

    test('text nodes and detached nodes are ignored without throwing', async () => {
        const { document, start } = setup('<div id="a"></div>');
        tag(document.getElementById('a'));
        start();
        await sleep(SETTLE);
        const a = document.getElementById('a');
        a.appendChild(document.createTextNode('hello'));
        a.appendChild(document.createComment('c'));
        const gone = document.createElement('span');
        a.appendChild(gone);
        a.removeChild(gone);
        await sleep(50);
        assert.equal(a.childNodes.length, 2);
    });

    test('first pass waits for the DOM to settle', async () => {
        const { document, start } = setup('<div id="a"><span id="b"></span></div>');
        tag(document.getElementById('a'));
        start();
        await sleep(150);
        assert.equal(document.getElementById('b').hasAttribute(`${P}-path`), false, 'not before the settle window');
        await sleep(SETTLE);
        assert.ok(document.getElementById('b').hasAttribute(`${P}-path`));
    });

    test('continuous mutation cannot postpone the first pass forever', { timeout: 20000 }, async () => {
        const { document, start } = setup('<div id="a"><span id="b"></span></div>');
        tag(document.getElementById('a'));
        start();
        const a = document.getElementById('a');
        const stop = Date.now() + 9500;
        while (Date.now() < stop) {
            a.setAttribute('data-tick', String(Date.now()));
            await sleep(100);
        }
        assert.ok(document.getElementById('b').hasAttribute(`${P}-path`), 'forced after the max wait');
    });

    test('waits for window load when the document is still loading', async () => {
        const { window, document, start } = setup('<div id="a"><span id="b"></span></div>', { readyState: 'loading' });
        tag(document.getElementById('a'));
        start();
        await sleep(SETTLE);
        assert.equal(document.getElementById('b').hasAttribute(`${P}-path`), false, 'not started before load');
        window.dispatchEvent(new window.Event('load'));
        await sleep(SETTLE);
        assert.ok(document.getElementById('b').hasAttribute(`${P}-path`));
    });

    test('is idempotent per prefix and supports custom prefixes', async () => {
        const { document, start } = setup('<div id="a"><span id="b"></span></div>');
        const a = document.getElementById('a');
        a.setAttribute('data-x-path', 'p'); a.setAttribute('data-x-line', '2'); a.setAttribute('data-x-column', '4');
        start('data-x');
        start('data-x');
        await sleep(SETTLE);
        const b = document.getElementById('b');
        assert.equal(b.getAttribute('data-x-line'), '2');
        assert.equal(b.getAttribute('data-x-inherited'), 'true');
        assert.equal(b.hasAttribute(`${P}-path`), false);
    });

    // The walk is iterative, so depth is bounded by memory, not the call stack. jsdom
    // itself is super-linear on deep trees (20k levels takes minutes), so this only
    // exercises a depth that a recursive walk would also survive; it guards the
    // parent-to-descendant propagation, not the stack limit.
    test('propagates through a deep chain', async () => {
        const depth = 1500;
        const { document, start } = setup('<div id="a"></div>');
        tag(document.getElementById('a'));
        let cur = document.getElementById('a');
        for (let i = 0; i < depth; i++) {
            const n = document.createElement('i');
            cur.appendChild(n);
            cur = n;
        }
        start();
        await sleep(SETTLE + 300);
        assert.ok(cur.hasAttribute(`${P}-path`));
    });

    test('does nothing outside a browser', () => {
        const mod = { exports: {} };
        // A context with no document / MutationObserver, like SSR.
        vm.runInNewContext(`(function (module, exports) {${source}\n})`, {})(mod, mod.exports);
        assert.doesNotThrow(() => mod.exports.oobeeInherit());
    });

    test('esm and cjs builds define the same behaviour', async () => {
        const esm = await import('../core/runtime.js');
        assert.equal(typeof esm.oobeeInherit, 'function');
        assert.equal(esm.default, esm.oobeeInherit);
        assert.doesNotThrow(() => esm.oobeeInherit());
        const cjs = require('../core/runtime.cjs');
        assert.equal(cjs.default, cjs.oobeeInherit);
    });
});

// In-process runs so the real module files are instrumented for coverage. The
// vm-based cases above prove behaviour in an isolated window; these load
// core/runtime.js and core/runtime.cjs directly against jsdom globals.
describe('oobeeInherit (in-process, esm and cjs files)', () => {
    const KEYS = ['window', 'document', 'MutationObserver'];

    async function withGlobals(html, fn) {
        const dom = new JSDOM(`<!doctype html><body>${html}</body>`, { pretendToBeVisual: true });
        const saved = Object.fromEntries(KEYS.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
        globalThis.window = dom.window;
        globalThis.document = dom.window.document;
        globalThis.MutationObserver = dom.window.MutationObserver;
        try {
            return await fn(dom.window.document, dom.window);
        } finally {
            for (const k of KEYS) {
                if (saved[k]) Object.defineProperty(globalThis, k, saved[k]); else delete globalThis[k];
            }
            dom.window.close();
        }
    }

    const variants = {
        esm: async () => (await import('../core/runtime.js')).oobeeInherit,
        cjs: async (n) => {
            const p = require.resolve('../core/runtime.cjs');
            delete require.cache[p];
            return require(p).oobeeInherit;
        },
    };

    for (const [kind, load] of Object.entries(variants)) {
        test(`${kind}: inherits on a loaded document and tracks later additions`, async () => {
            const start = await load(`inherit-${kind}`);
            const pre = `data-in-${kind}`;
            await withGlobals('<div id="a"><span id="b"></span></div>', async (document) => {
                const a = document.getElementById('a');
                for (const [k, v] of [['path', 'src/Z.jsx'], ['line', '12'], ['column', '3']]) a.setAttribute(`${pre}-${k}`, v);
                start(pre);
                start(pre);
                await sleep(SETTLE);
                assert.equal(document.getElementById('b').getAttribute(`${pre}-line`), '12');
                const late = document.createElement('p');
                a.appendChild(late);
                await sleep(50);
                assert.equal(late.getAttribute(`${pre}-line`), '12');
                assert.equal(late.getAttribute(`${pre}-inherited`), 'true');
            });
        });

        test(`${kind}: defers the first pass until the load event while loading`, async () => {
            const start = await load(`loading-${kind}`);
            const pre = `data-ld-${kind}`;
            await withGlobals('<div id="a"><span id="b"></span></div>', async (document, window) => {
                Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });
                const a = document.getElementById('a');
                for (const [k, v] of [['path', 'p'], ['line', '2'], ['column', '4']]) a.setAttribute(`${pre}-${k}`, v);
                start(pre);
                await sleep(SETTLE);
                const b = document.getElementById('b');
                assert.equal(b.hasAttribute(`${pre}-path`), false, 'nothing happens before load');
                window.dispatchEvent(new window.Event('load'));
                await sleep(SETTLE);
                assert.equal(b.getAttribute(`${pre}-line`), '2');
            });
        });

        test(`${kind}: is a no-op without a DOM`, async () => {
            const start = await load(`ssr-${kind}`);
            const had = KEYS.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]);
            for (const [k] of had) delete globalThis[k];
            try {
                assert.doesNotThrow(() => start(`data-ssr-${kind}`));
            } finally {
                for (const [k, d] of had) if (d) Object.defineProperty(globalThis, k, d);
            }
        });

        test(`${kind}: a missing body does not throw on the first pass`, async () => {
            const start = await load(`nobody-${kind}`);
            await withGlobals('<div id="a"></div>', async (document) => {
                Object.defineProperty(document, 'body', { value: null, configurable: true });
                assert.doesNotThrow(() => start(`data-nb-${kind}`));
                await sleep(SETTLE);
            });
        });
    }
});
