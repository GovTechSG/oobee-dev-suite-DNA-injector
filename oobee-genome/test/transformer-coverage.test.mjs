// Branch coverage for the transformer, and differential checks that the ESM and
// CJS builds (hand-maintained twins) produce byte-identical output.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { parse } from '@babel/parser';

const require = createRequire(import.meta.url);
const esm = await import('../core/transformer.js');
const cjs = require('../core/transformer.cjs');
const at = (rel) => path.join(process.cwd(), rel);
const count = (s, re = /data-oobee-path/g) => (s.match(re) || []).length;
const stripRuntime = (s) => s.replace(/\nimport \{ oobeeInherit[^\n]*\n/, '\n');
const babel = (code) => parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });

// Both builds run every case; they must agree and satisfy the same assertions.
function both(name, fn) {
    for (const [label, t] of [['esm', esm], ['cjs', cjs]]) test(`${name} [${label}]`, () => fn(t));
}

describe('JSX names and shapes', () => {
    both('namespaced SVG names (xlink:href style) are tagged and parse', (t) => {
        const out = t.injectDNA('const a = <svg:rect width="1" />;', at('src/n.jsx'));
        assert.equal(count(out), 1);
        assert.match(out, /<svg:rect data-oobee-path/);
        babel(out);
    });

    both('member expressions of any depth are tagged', (t) => {
        const out = t.injectDNA('const a = <A.B.C x="1"><A.B.D /></A.B.C>;', at('src/m.jsx'));
        assert.equal(count(out), 2);
        babel(out);
    });

    both('JSX spread attributes and expression children survive', (t) => {
        const out = t.injectDNA('const a = (p) => <div {...p} id="x">{p.list.map((i) => <li key={i}>{i}</li>)}</div>;', at('src/s.jsx'));
        assert.equal(count(out), 2);
        babel(out);
    });

    both('JSX inside attributes and ternaries is reached', (t) => {
        const out = t.injectDNA('const a = (f) => f ? <b icon={<i />} /> : <u />;', at('src/t.jsx'));
        assert.equal(count(out), 3);
    });

    both('existing data-oobee attributes (any of the three) prevent double injection', (t) => {
        for (const attr of ['data-oobee-path="x"', 'data-oobee-line="1"', 'data-oobee-column="1"']) {
            const src = `export const a = <div ${attr} />;`;
            const out = t.injectDNA(src, at('src/d.jsx'));
            // The element itself is untouched: its attributes are exactly the original one.
            assert.ok(out.startsWith(src), attr);
            assert.equal(count(out, /data-oobee-(path|line|column)=/g), 1, attr);
        }
    });

    both('a non-ObjectExpression attribute-less JSX tag with a custom prefix', (t) => {
        const out = t.injectDNA('export const a = <div />;', at('src/p.jsx'), { attributePrefix: 'data-x' });
        assert.match(out, /data-x-path="src\/p.jsx"/);
        assert.ok(!out.includes('data-oobee-path'));
        assert.match(out, /__oobeeInherit\("data-x"\)/);
    });
});

describe('defensive branches', () => {
    both('numeric / odd object keys in createElement props do not break duplicate detection', (t) => {
        const src = "React.createElement('a', { 1: 'x', 'k': 2, [dyn]: 3, fn() {} });";
        const out = t.injectDNA(src, at('src/k.js'));
        assert.equal(count(out, /'data-oobee-path'/g), 1);
        new Function('React', 'dyn', stripRuntime(out))({ createElement: () => null }, 'd');
    });

    both('member and namespaced JSX names with unusual shapes still parse and tag', (t) => {
        const out = t.injectDNA('export const a = <this.Foo><xlink:use /></this.Foo>;', at('src/odd.jsx'));
        assert.equal(count(out), 2);
        assert.match(out, /<this\.Foo data-oobee-path/);
        assert.match(out, /<xlink:use data-oobee-path/);
    });
});

describe('React.createElement and document.createElement', () => {
    both('first-argument forms: string, identifier, member, computed, call', (t) => {
        const src = [
            "React.createElement('a');",
            'React.createElement(Btn);',
            'React.createElement(Lib.Item, null);',
            'React.createElement(Lib.Deep.Item, null);',
            'React.createElement(Lib[name], null);',
            'React.createElement(make(), null);',
            'React.createElement();',
            'React.createElement(`div`, null);',
        ].join('\n');
        const out = t.injectDNA(src, at('src/ce.js'));
        assert.equal(count(out, /'data-oobee-path'/g), 4, 'a, Btn, Lib.Item, Lib.Deep.Item');
        assert.match(out, /React\.createElement\(Lib\[name\], null\)/);
        assert.match(out, /React\.createElement\(make\(\), null\)/);
        assert.match(out, /React\.createElement\(\);/);
    });

    both('props forms: existing keys (identifier, string, spread), variable props, non-object props', (t) => {
        const src = [
            "React.createElement('a', { 'data-oobee-path': 'x' });",
            "React.createElement('b', { 'data-oobee-line': 1 });",
            "React.createElement('c', { ...props, id: 1 });",
            "React.createElement('d', props);",
            "React.createElement('e', undefined);",
            "React.createElement('f', {});",
            "React.createElement('g', { [k]: 1 });",
        ].join('\n');
        const out = t.injectDNA(src, at('src/pp.js'));
        // a and b already carry a key; d (variable) is left alone; c, e, f, g get attrs.
        assert.equal(count(out, /'data-oobee-column': "/g), 4);
        assert.match(out, /createElement\('d', props\)/);
        new Function('React', 'props', 'k', stripRuntime(out))({ createElement: () => null }, {}, 'k');
    });

    both('tags in the blacklist are not injected', (t) => {
        const src = "React.createElement('skip', null); const e = document.createElement('skip');";
        assert.equal(t.injectDNA(src, at('src/b.js'), { blacklist: ['skip'] }), src);
    });

    both('document.createElement: non-string and computed forms are untouched', (t) => {
        const src = 'const a = document.createElement(tag); const b = document["createElement"]("div"); const c = other.createElement("div");';
        assert.equal(t.injectDNA(src, at('src/dc.js')), src);
    });

    both('document.createElement is wrapped and keeps its position', (t) => {
        const out = t.injectDNA("\n\nconst e = document.createElement('div');", at('src/dc.js'));
        assert.match(out, /__oobeeEl\.setAttribute\("data-oobee-line", "3"\)/);
    });
});

describe('file kinds and entry points', () => {
    both('unsupported extensions that slip past the include filter are returned unchanged', (t) => {
        const src = 'body { color: red }';
        assert.equal(t.injectDNA(src, at('src/a.css'), { includePatterns: [/\.css$/] }), src);
    });

    both('.ts files containing no JSX are unchanged, and ES module detection gates the runtime import', (t) => {
        const cjsSrc = 'const a = <div />; module.exports = a;';
        const out = t.injectDNA(cjsSrc, at('src/script.jsx'));
        assert.equal(count(out), 1);
        assert.ok(!out.includes('oobeeInherit'), 'script (non-module) sources do not get an import statement');
        babel(stripRuntime(out).replace('module.exports = a;', ''));
    });

    both('files without JSX produce no edits (and no runtime import)', (t) => {
        const src = 'export const x = 1;';
        assert.equal(t.injectDNA(src, at('src/none.jsx')), src);
    });

    both('invalid attributePrefix throws; pathRoot must be a non-empty string', (t) => {
        for (const bad of ['', 'a b', '"x', 'x"', '1x', 'a.b', null, 5]) {
            assert.throws(() => t.injectDNA('<div />', at('src/a.jsx'), { attributePrefix: bad }), /invalid attributePrefix/, String(bad));
        }
        for (const bad of ['', '   ', null, 5]) {
            assert.throws(() => t.injectDNA('const a = <div />;', at('src/a.jsx'), { pathRoot: bad }), /pathRoot/, String(bad));
        }
    });

    both('shouldTransform: defaults, custom include and exclude', (t) => {
        assert.equal(t.shouldTransform(at('src/a.vue')), true);
        assert.equal(t.shouldTransform(at('src/a.html')), true);
        assert.equal(t.shouldTransform(at('src/a.css')), false);
        assert.equal(t.shouldTransform(at('a/node_modules/b.js')), false);
        assert.equal(t.shouldTransform(at('src/a.css'), { includePatterns: [/\.css$/] }), true);
        assert.equal(t.shouldTransform(at('src/a.js'), { excludePatterns: [/src/] }), false);
    });

    both('getPosition is 1-based and handles first, middle and last lines', (t) => {
        const s = 'ab\ncd\nef';
        assert.deepEqual(t.getPosition(s, 0), { line: 1, column: 1 });
        assert.deepEqual(t.getPosition(s, 4), { line: 2, column: 2 });
        assert.deepEqual(t.getPosition(s, s.length - 1), { line: 3, column: 2 });
        assert.deepEqual(t.getPosition('', 0), { line: 1, column: 1 });
    });

    both('exports exactly the public surface', (t) => {
        assert.deepEqual(Object.keys(t).sort(), ['getPosition', 'injectDNA', 'shouldTransform']);
    });
});

describe('emitted path rules', () => {
    both('files outside pathRoot collapse to the file name; the root itself maps to "."', (t) => {
        const out = t.injectDNA('const a = <div />;', '/elsewhere/deep/Out.jsx', { includePatterns: [/\.jsx$/], excludePatterns: [] });
        assert.match(out, /data-oobee-path="Out.jsx"/);
        const rooted = t.injectDNA('const a = <div />;', at('apps/web/src/R.jsx'), { pathRoot: at('apps') });
        assert.match(rooted, /data-oobee-path="web\/src\/R.jsx"/);
    });

    both('hostile file names are escaped per context', (t) => {
        const evil = 'src/x" onload="alert(1).jsx';
        const jsx = t.injectDNA('const a = <div />;', at(evil));
        assert.ok(!/ onload="alert/.test(jsx.replace(/&quot;/g, '')) || jsx.includes('&quot;'));
        assert.match(jsx, /data-oobee-path="src\/x&quot; onload=&quot;alert\(1\)\.jsx"/);
        const js = t.injectDNA("React.createElement('a');", at('src/x"y.js'));
        assert.match(js, /'data-oobee-path': "src\/x\\"y\.js"/);
    });
});

describe('Vue SFC branches', () => {
    both('no <template> block: only the runtime is considered', (t) => {
        const src = '<script setup>\nconst a = 1;\n</script>';
        assert.equal(t.injectDNA(src, at('src/V.vue')), src);
    });

    both('script / script setup / ts / unsupported lang / no script', (t) => {
        const tpl = '<template><div /></template>';
        const plain = t.injectDNA(`${tpl}\n<script>export default {};</script>`, at('src/a.vue'));
        assert.match(plain, /<script>export default \{\};\nimport \{ oobeeInherit/);
        const setup = t.injectDNA(`${tpl}\n<script setup>const x = 1;</script>`, at('src/b.vue'));
        assert.match(setup, /const x = 1;\nimport \{ oobeeInherit/);
        const ts = t.injectDNA(`${tpl}\n<script lang="ts">export default {};</script>`, at('src/c.vue'));
        assert.match(ts, /oobeeInherit/);
        const coffee = t.injectDNA(`${tpl}\n<script lang="coffee">x = 1</script>`, at('src/d.vue'));
        assert.ok(!coffee.includes('oobeeInherit'), 'unknown script language is never rewritten');
        assert.equal(count(coffee), 1);
        const none = t.injectDNA(tpl, at('src/e.vue'));
        assert.match(none, /<script>\nimport \{ oobeeInherit[^\n]*\n<\/script>/);
    });

    both('inheritChildren: false removes the runtime from every file kind', (t) => {
        const o = { inheritChildren: false };
        assert.ok(!t.injectDNA('const a = <div />;', at('src/a.jsx'), o).includes('oobeeInherit'));
        assert.ok(!t.injectDNA('<template><div /></template>', at('src/a.vue'), o).includes('oobeeInherit'));
    });

    both('Vue built-ins and kebab/Pascal variants are skipped; plain and custom components are tagged', (t) => {
        const src = '<template><div><Teleport to="body"><i/></Teleport><keep-alive><b/></keep-alive><KeepAlive><u/></KeepAlive><Suspense><s/></Suspense><transition-group><p/></transition-group><TransitionGroup><q/></TransitionGroup><MyThing/><my-thing/></div></template>';
        const out = t.injectDNA(src, at('src/B.vue'), { inheritChildren: false });
        for (const skipped of ['<Teleport ', '<keep-alive>', '<KeepAlive>', '<Suspense>', '<transition-group>', '<TransitionGroup>']) {
            assert.ok(out.includes(skipped), skipped);
        }
        assert.match(out, /<MyThing data-oobee-path/);
        assert.match(out, /<my-thing data-oobee-path/);
        assert.equal(count(out), 1 + 6 + 2, 'div, 6 plain children, 2 custom components');
    });

    both('existing attributes prevent double injection in Vue and HTML', (t) => {
        const vue = '<template><div data-oobee-path="x" /></template>';
        assert.equal(count(t.injectDNA(vue, at('src/a.vue'), { inheritChildren: false })), 1);
        const html = '<main data-oobee-line="1"><p>x</p></main>';
        assert.equal(count(t.injectDNA(html, at('p/a.html'))), 1, 'only <p> gains attributes');
    });
});

describe('HTML branches', () => {
    both('blacklisted tags are skipped, entities and attributes are preserved', (t) => {
        const out = t.injectDNA('<div class="a">&amp;<custom-el></custom-el><skipme></skipme></div>', at('p/b.html'), { blacklist: ['skipme'] });
        assert.equal(count(out), 2);
        assert.ok(out.includes('&amp;'));
        assert.match(out, /<div data-oobee-path="p\/b.html"[^>]* class="a">/);
    });

    both('multi-line documents report the right line and column', (t) => {
        const out = t.injectDNA('<ul>\n  <li>one</li>\n    <li>two</li>\n</ul>', at('p/l.html'));
        assert.match(out, /<li data-oobee-path="p\/l.html" data-oobee-line="2" data-oobee-column="3">/);
        assert.match(out, /<li data-oobee-path="p\/l.html" data-oobee-line="3" data-oobee-column="5">/);
    });

    both('empty and text-only HTML are unchanged', (t) => {
        assert.equal(t.injectDNA('', at('p/e.html')), '');
        assert.equal(t.injectDNA('just text', at('p/t.html')), 'just text');
    });
});

describe('differential: esm and cjs agree on a broad corpus', () => {
    const corpus = [
        ['src/App.tsx', "import { Button } from '@mui/material';\nexport const A = () => (<><Button>go</Button><input /></>);"],
        ['src/G.tsx', 'export const f = <T,>(x: T) => x;\nexport const C = () => <p>{f<number>(1)}</p>;'],
        ['src/H.jsx', "'use client';\nexport default function H() { return <section><h1>hi</h1></section>; }"],
        ['src/n.js', "React.createElement('div', null, React.createElement(Foo, { a: 1 }));"],
        ['src/c.js', "const e = document.createElement('canvas'); document.body.appendChild(e);"],
        ['src/v.vue', '<template>\n  <v-app><v-btn>x</v-btn><slot /></v-app>\n</template>\n<script setup lang="ts">\nconst a: number = 1;\n</script>'],
        ['p/i.html', '<!doctype html><html><body><main><p>x</p></main></body></html>'],
        ['src/css.css', '.a{}'],
        ['src/broken.jsx', 'const a = <div'],
    ];
    for (const [file, code] of corpus) {
        test(`identical output for ${file}`, () => {
            const run = (t) => { try { return t.injectDNA(code, at(file), { includePatterns: [/.*/], excludePatterns: [] }); } catch (e) { return `THROW:${e.constructor.name}`; } };
            assert.equal(run(cjs), run(esm));
        });
    }

    test('syntax errors surface as exceptions for adapters to catch', () => {
        assert.throws(() => esm.injectDNA('const a = <div', at('src/x.jsx')));
        assert.throws(() => cjs.injectDNA('const a = <div', at('src/x.jsx')));
    });
});
