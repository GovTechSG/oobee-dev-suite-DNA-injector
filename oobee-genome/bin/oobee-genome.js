#!/usr/bin/env node
// oobee-genome CLI: a dev-only static server for plain HTML / CSS / JS projects that have no bundler.
//
//   oobee-genome serve [dir] [--port 3000] [--root <pathRoot>] [--host 127.0.0.1]
//
// HTML (and plain JS) files are tagged with data-oobee-path / -line / -column as they are
// served, exactly like the Vite / webpack / Next adapters. Nothing on disk is modified.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { injectDNA } from '../core/transformer.js';
import { mergeOptions } from '../core/options.js';
import { isDevelopmentBuild } from '../core/environment.js';

const RUNTIME_URL = '/__oobee/runtime.js';
const RUNTIME_FILE = fileURLToPath(new URL('../core/runtime.js', import.meta.url));
const TYPES = {
    '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff',
    '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.map': 'application/json'
};

function parseArgs(argv) {
    const args = { command: argv[0], dir: '.', port: 3000, host: '127.0.0.1', root: undefined, verbose: false };
    const rest = argv.slice(1);
    for (let i = 0; i < rest.length; i++) {
        const a = rest[i];
        if (a === '--port' || a === '-p') args.port = Number(rest[++i]);
        else if (a === '--host') args.host = rest[++i];
        else if (a === '--root') args.root = rest[++i];
        else if (a === '--verbose') args.verbose = true;
        else if (!a.startsWith('-')) args.dir = a;
        else throw new Error(`Unknown option ${a}`);
    }
    if (!Number.isInteger(args.port) || args.port < 0 || args.port > 65535) throw new Error('Invalid --port');
    return args;
}

function inject(code, file, options) {
    try {
        return injectDNA(code, file, options);
    } catch (error) {
        // Never break the page because one file could not be parsed.
        if (options.verbose) console.error(`[oobee-genome] skipped ${file}: ${error.message}`);
        return code;
    }
}

function withRuntime(html, prefix) {
    const tag = `<script type="module">import { oobeeInherit } from '${RUNTIME_URL}'; oobeeInherit(${JSON.stringify(prefix)});</script>`;
    const i = html.toLowerCase().lastIndexOf('</body>');
    return i === -1 ? html + tag : html.slice(0, i) + tag + html.slice(i);
}

export function createServer({ dir = '.', root, verbose = false } = {}) {
    const serveRoot = fs.realpathSync(path.resolve(dir));
    const pathRoot = fs.realpathSync(path.resolve(root || serveRoot));
    // The runtime is added by this server, so the transform must not add its bare-specifier import.
    const options = mergeOptions({ pathRoot, verbose, inheritChildren: false });

    return http.createServer((req, res) => {
        const send = (status, body, type = 'text/plain; charset=utf-8') => {
            res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
            res.end(body);
        };
        try {
            let pathname;
            try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { return send(400, 'Bad request'); }

            if (pathname === RUNTIME_URL) return send(200, fs.readFileSync(RUNTIME_FILE), TYPES['.js']);
            if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'Method not allowed');

            let file = path.resolve(serveRoot, '.' + pathname);
            if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
            const real = fs.existsSync(file) ? fs.realpathSync(file) : null;
            const rel = real && path.relative(serveRoot, real);
            // Stay inside the served folder (also blocks symlink escapes) and never expose dotfiles.
            if (!real || rel.startsWith('..') || path.isAbsolute(rel) || rel.split(path.sep).some((s) => s.startsWith('.'))) {
                return send(404, 'Not found');
            }

            const ext = path.extname(real).toLowerCase();
            const type = TYPES[ext] || 'application/octet-stream';
            const inNodeModules = rel.split(path.sep).includes('node_modules');
            if (!inNodeModules && (ext === '.html' || ext === '.htm')) {
                const html = inject(fs.readFileSync(real, 'utf8'), real.replace(/\.htm$/i, '.html'), options);
                return send(200, withRuntime(html, options.attributePrefix), type);
            }
            if (!inNodeModules && ext === '.js') {
                return send(200, inject(fs.readFileSync(real, 'utf8'), real, options), type);
            }
            res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
            return req.method === 'HEAD' ? res.end() : fs.createReadStream(real).pipe(res);
        } catch (error) {
            return send(500, `oobee-genome: ${error.message}`);
        }
    });
}

function main() {
    let args;
    try { args = parseArgs(process.argv.slice(2)); } catch (error) { console.error(`[oobee-genome] ${error.message}`); process.exit(2); }
    if (args.command !== 'serve') {
        console.error('Usage: oobee-genome serve [dir] [--port 3000] [--root <pathRoot>] [--host 127.0.0.1] [--verbose]');
        process.exit(args.command ? 2 : 0);
    }
    // Same fail-closed gate as every adapter. Running `serve` is the explicit dev opt-in (like
    // `webpack --mode development`), so NODE_ENV need not be set, but CI / production signals refuse.
    if (!isDevelopmentBuild('development')) {
        console.error('[oobee-genome] Refusing to run: this does not look like a local development environment (CI or production signals present).');
        process.exit(1);
    }
    const server = createServer({ dir: args.dir, root: args.root, verbose: args.verbose });
    server.on('error', (error) => { console.error(`[oobee-genome] ${error.message}`); process.exit(1); });
    server.listen(args.port, args.host, () => {
        console.log(`[oobee-genome] Serving ${path.resolve(args.dir)} with source tracking at http://${args.host === '0.0.0.0' ? 'localhost' : args.host}:${server.address().port}`);
    });
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
