// Browser-side companion to the build transform. The transform can only tag
// elements written in the app's own source; a component library (MUI, Vuetify)
// renders extra DOM of its own (<input>, <label>, ripple <span>, ...). This
// gives each such element the attributes of its closest tagged ancestor, so it
// maps back to the component the developer wrote. Inherited elements also get
// `${prefix}-inherited="true"` so consumers can tell them from exact matches.
// Dev-only by construction: the transform only imports this when it injected.

const started = new Set();
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);

function oobeeInherit(prefix = 'data-oobee') {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
    if (started.has(prefix)) return;
    started.add(prefix);

    const keys = ['path', 'line', 'column'].map((k) => `${prefix}-${k}`);
    const inheritedKey = `${prefix}-inherited`;
    const read = (el) => (el.hasAttribute(keys[0]) ? keys.map((k) => el.getAttribute(k)) : null);

    function apply(root, inherited) {
        // Iterative DFS so deep trees cannot overflow the stack.
        const stack = [[root, inherited]];
        while (stack.length) {
            const [el, from] = stack.pop();
            if (SKIP.has(el.tagName)) continue;
            let current = from;
            const own = read(el);
            if (own) {
                current = own;
            } else if (from) {
                keys.forEach((k, i) => el.setAttribute(k, from[i]));
                el.setAttribute(inheritedKey, 'true');
            }
            for (let c = el.lastElementChild; c; c = c.previousElementSibling) stack.push([c, current]);
        }
    }

    function nearest(el) {
        for (let p = el; p; p = p.parentElement) {
            const found = read(p);
            if (found) return found;
        }
        return null;
    }

    function run(nodes) {
        for (const node of nodes) {
            if (node.nodeType !== 1 || !node.isConnected) continue;
            apply(node, node.parentElement ? nearest(node.parentElement) : null);
        }
    }

    const observer = new MutationObserver((records) => {
        const added = [];
        for (const r of records) for (const n of r.addedNodes) added.push(n);
        if (added.length) run(added);
    });

    // SSR frameworks (Next, Nuxt) hydrate after the load event, and React reports
    // attributes it did not render as a hydration mismatch. So the first pass
    // waits for the DOM to go quiet (no mutations for SETTLE_MS, at most
    // MAX_WAIT_MS). Later additions are client-rendered and handled live.
    const SETTLE_MS = 500;
    const MAX_WAIT_MS = 8000;
    const begin = () => {
        let timer;
        const startedAt = Date.now();
        const settle = new MutationObserver(() => schedule());
        const go = () => {
            settle.disconnect();
            if (document.body) run([document.body]);
            observer.observe(document.documentElement, { childList: true, subtree: true });
        };
        const schedule = () => {
            clearTimeout(timer);
            const left = MAX_WAIT_MS - (Date.now() - startedAt);
            timer = setTimeout(go, Math.max(0, Math.min(SETTLE_MS, left)));
        };
        settle.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
        schedule();
    };
    if (document.readyState === 'complete') begin();
    else window.addEventListener('load', begin, { once: true });
}

export { oobeeInherit };
export default oobeeInherit;
