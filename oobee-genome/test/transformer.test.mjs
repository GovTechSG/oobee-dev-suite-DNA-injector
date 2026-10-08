// Transformer and adapter tests: injection output, path handling, escaping,
// performance, dev-only gating, and the attribute contract Dev Suite reads.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { parse } from '@babel/parser';
import parse5 from 'parse5';

const require = createRequire(import.meta.url);
const esm = await import('../core/transformer.js');
const cjs = require('../core/transformer.cjs');
const root = process.cwd();
const at = (rel) => path.join(root, rel);

const parseJsx = (code, file = 'x.tsx') =>
    parse(code, { sourceType: 'module', plugins: [...(file.endsWith('x') ? ['jsx'] : []), ...(/\.tsx?$/.test(file) ? ['typescript'] : [])] });

// Collect data-oobee-* values from JSX output, as the browser would see them.
const jsxAttrs = (code) => {
    const out = [];
    const visit = (n) => {
        if (!n || typeof n !== 'object') return;
        if (n.type === 'JSXOpeningElement') {
            const a = {};
            for (const at of n.attributes) {
                if (at.type === 'JSXAttribute' && at.value?.type === 'StringLiteral') a[at.name.name] = at.value.value;
            }
            out.push({ tag: n.name.name, ...a });
        }
        for (const k of Object.keys(n)) if (k !== 'loc') visit(n[k]);
    };
    visit(parseJsx(code).program);
    return out;
};

const htmlAttrs = (html) => {
    const out = [];
    const visit = (n) => {
        if (n.attrs) out.push(Object.fromEntries(n.attrs.map((a) => [a.name, a.value])));
        for (const c of n.childNodes || []) visit(c);
    };
    visit(parse5.parseFragment(html));
    return out;
};

describe('injection output', () => {
    test('JSX host elements get path/line/column; components are skipped', () => {
        const src = 'const A = () => (\n  <div>\n    <Button />\n    <span>hi</span>\n  </div>\n);';
        const out = esm.injectDNA(src, at('src/App.tsx'));
        const attrs = jsxAttrs(out);
        assert.deepEqual(attrs.map((a) => a.tag), ['div', 'Button', 'span']);
        assert.deepEqual(attrs[0], { tag: 'div', 'data-oobee-path': 'src/App.tsx', 'data-oobee-line': '2', 'data-oobee-column': '3' });
        assert.equal(attrs[1]['data-oobee-path'], undefined);
        assert.equal(attrs[2]['data-oobee-line'], '4');
    });

    test('TypeScript generics are not treated as tags', () => {
        const src = 'function id<T>(x: T): T { return x; }\nconst m = new Map<string, number>();\nexport const C = () => <p>{id<number>(1)}</p>;';
        const out = esm.injectDNA(src, at('src/g.tsx'));
        parseJsx(out, 'g.tsx');
        assert.equal((out.match(/data-oobee-path/g) || []).length, 1);
    });

    test('plain .ts with no JSX parses and is unchanged', () => {
        const src = 'export const f = <T,>(x: T) => x;\nconst y = 1 < 2 && 3 > 1;';
        assert.equal(esm.injectDNA(src, at('src/u.ts')), src);
    });

    test('already-injected elements are not doubled', () => {
        const once = esm.injectDNA('const a = <div />;', at('src/a.jsx'));
        assert.equal(esm.injectDNA(once, at('src/a.jsx')), once);
    });

    test('React.createElement: no props, null props, object props, component skipped', () => {
        const src = [
            "React.createElement('a');",
            "React.createElement('b', null);",
            "React.createElement('c', { id: 'x' });",
            'React.createElement(Button, null);',
        ].join('\n');
        const out = esm.injectDNA(src, at('src/ce.js'));
        assert.equal((out.match(/'data-oobee-path': "src\/ce.js"/g) || []).length, 3);
        assert.match(out, /React\.createElement\(Button, null\)/);
        new Function('React', 'Button', out)({ createElement: () => null }, null);
    });

    test('document.createElement still returns the element and sets attributes', () => {
        const out = esm.injectDNA("const el = document.createElement('button');\nexport { el };", at('src/dom.js'));
        const set = {};
        const fakeEl = { setAttribute: (k, v) => (set[k] = v) };
        const body = out.replace('export { el };', 'return el;');
        const el = new Function('document', body)({ createElement: () => fakeEl });
        assert.equal(el, fakeEl);
        assert.deepEqual(set, { 'data-oobee-path': 'src/dom.js', 'data-oobee-line': '1', 'data-oobee-column': '12' });
    });

    test('HTML: real start tags only, comments and text untouched', () => {
        const src = '<!-- <fake> -->\n<main>\n  <p>a &lt;b&gt;</p>\n</main>';
        const out = esm.injectDNA(src, at('public/index.html'));
        assert.ok(out.startsWith('<!-- <fake> -->'));
        const attrs = htmlAttrs(out).filter((a) => a['data-oobee-path']);
        assert.equal(attrs.length, 2);
        assert.deepEqual(attrs[1], { 'data-oobee-path': 'public/index.html', 'data-oobee-line': '3', 'data-oobee-column': '3' });
    });

    test('Vue: only template elements are tagged; script and components left alone', () => {
        const src = '<template>\n  <div><MyComp /><span>x</span></div>\n</template>\n<script>const s = "<div>";</script>';
        const out = esm.injectDNA(src, at('src/C.vue'));
        assert.equal((out.match(/data-oobee-path="src\/C.vue"/g) || []).length, 2);
        assert.match(out, /<MyComp \/>/);
        assert.match(out, /const s = "<div>";/);
    });

    test('query strings are stripped from the emitted path when the id is included', () => {
        const out = esm.injectDNA('const a = <i />;', `${at('src/q.jsx')}?t=123`, { includePatterns: [/\.jsx/] });
        assert.equal(jsxAttrs(out)[0]['data-oobee-path'], 'src/q.jsx');
    });

    test('include/exclude patterns and node_modules are honoured', () => {
        const src = 'const a = <b />;';
        assert.equal(esm.injectDNA(src, at('node_modules/x/a.jsx')), src);
        assert.equal(esm.injectDNA(src, at('src/a.css')), src);
        assert.equal(esm.shouldTransform(at('src/a.tsx')), true);
        assert.equal(esm.shouldTransform(at('node_modules/a.tsx')), false);
    });

    test('CJS and ESM builds produce identical output', () => {
        const cases = [
            ['const a = () => <div><p /></div>;', 'src/a.tsx'],
            ["React.createElement('a', null);", 'src/b.js'],
            ['<div><p>x</p></div>', 'src/c.html'],
            ['<template><div /></template>', 'src/d.vue'],
        ];
        for (const [code, f] of cases) assert.equal(cjs.injectDNA(code, at(f)), esm.injectDNA(code, at(f)), f);
    });
});

describe('emitted path', () => {
    test('is project-relative with forward slashes, never the absolute host path', () => {
        const out = esm.injectDNA('const a = <div />;', at('src/deep/A.jsx'));
        assert.equal(jsxAttrs(out)[0]['data-oobee-path'], 'src/deep/A.jsx');
        assert.ok(!out.includes(root));
    });

    test('files outside the project collapse to their basename', () => {
        const outside = path.resolve(root, '..', '..', 'secret-home', 'Other.jsx');
        const out = esm.injectDNA('const a = <div />;', outside);
        assert.equal(jsxAttrs(out)[0]['data-oobee-path'], 'Other.jsx');
        assert.ok(!out.includes('secret-home'));
    });

    test('Dev Suite matcher resolves the emitted path (exact or suffix)', () => {
        // Mirrors matchesPath in oobee-dev-suite-vscode-oss src/dynamicScanner.ts.
        const norm = (v) => v.replace(/\\/g, '/');
        const matches = (el, cand) => norm(el) === norm(cand) || norm(el).endsWith(`/${norm(cand)}`);
        const emitted = jsxAttrs(esm.injectDNA('const a = <div />;', at('src/App.tsx')))[0]['data-oobee-path'];
        assert.ok(matches(emitted, emitted));
        assert.ok(matches(`/${emitted}`, emitted));
    });
});

describe('escaping of hostile file names', () => {
    const hostile = [
        'x" onload="alert(1).jsx',
        "x' }); alert(1); ({ '.jsx",
        'back\\"slash.jsx',
        'a&b<c>d.jsx',
        'line\nbreak.jsx',
    ];

    for (const name of hostile) {
        test(`JSX attribute keeps ${JSON.stringify(name)} as one literal value`, () => {
            const out = esm.injectDNA('const a = <div id="k" />;', at(`src/${name}`));
            const [a] = jsxAttrs(out);
            assert.deepEqual(Object.keys(a).sort(), ['data-oobee-column', 'data-oobee-line', 'data-oobee-path', 'id', 'tag']);
            assert.ok(!/onload/.test(Object.keys(a).join()));
        });

        test(`createElement props keep ${JSON.stringify(name)} inside the string`, () => {
            const out = esm.injectDNA("React.createElement('div', null);", at(`src/${name}`));
            let props;
            new Function('React', out)({ createElement: (_t, p) => (props = p) });
            assert.equal(props['data-oobee-path'], `src/${name}`.split(path.sep).join('/'));
            assert.deepEqual(Object.keys(props).length, 3);
        });

        test(`HTML attribute keeps ${JSON.stringify(name)} as one value`, () => {
            const out = esm.injectDNA('<div></div>', at(`src/${name.replace('.jsx', '.html')}`));
            const [a] = htmlAttrs(out);
            assert.deepEqual(Object.keys(a).sort(), ['data-oobee-column', 'data-oobee-line', 'data-oobee-path']);
        });
    }

    test('unsafe attributePrefix is rejected', () => {
        for (const p of ['data-x" onload="y', "x': 1, evil: '", '', 'a b', 1]) {
            assert.throws(() => esm.injectDNA('const a = <div />;', at('src/p.jsx'), { attributePrefix: p }), /attributePrefix/);
        }
        assert.match(esm.injectDNA('const a = <div />;', at('src/p.jsx'), { attributePrefix: 'data-custom' }), /data-custom-path/);
    });
});

describe('performance', () => {
    test('position lookups are linear: 40k tags transform quickly', () => {
        const src = `const A = () => (<div>\n${'<span>x</span>\n'.repeat(40_000)}</div>);`;
        const t0 = performance.now();
        const out = esm.injectDNA(src, at('src/big.jsx'));
        const ms = performance.now() - t0;
        assert.equal((out.match(/data-oobee-line/g) || []).length, 40_001);
        assert.ok(ms < 5000, `took ${ms}ms`);
    });

    test('getPosition is still exported and correct', () => {
        assert.deepEqual(esm.getPosition('ab\ncd\nef', 7), { line: 3, column: 2 });
        assert.deepEqual(cjs.getPosition('abc', 0), { line: 1, column: 1 });
    });
});
