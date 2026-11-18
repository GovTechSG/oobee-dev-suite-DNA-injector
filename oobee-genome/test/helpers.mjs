// Shared test helpers (not collected as a test file: no `.test.` in the name).
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const ENV_KEYS = [
    'NODE_ENV', 'CI', 'CONTINUOUS_INTEGRATION', 'NEXT_PHASE', 'VERCEL_ENV',
    'OOBEE_DNA_FORCE', 'OOBEE_DNA_FORCE_ACK',
];

// Run fn with a controlled environment. Every gate variable is cleared first,
// then `env` is applied (undefined deletes), and the originals are restored.
export function withEnv(env, fn) {
    const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    for (const k of ENV_KEYS) delete process.env[k];
    for (const [k, v] of Object.entries(env)) {
        if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
    const restore = () => {
        for (const k of ENV_KEYS) {
            if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
        }
    };
    let result;
    try {
        result = fn();
    } catch (e) {
        restore();
        throw e;
    }
    if (result && typeof result.then === 'function') return result.finally(restore);
    restore();
    return result;
}

export const DEV = { NODE_ENV: 'development' };
export const FORCE = { OOBEE_DNA_FORCE: '1', OOBEE_DNA_FORCE_ACK: 'i-understand-this-leaks-paths' };

export function tmpDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'oobee-test-'));
}

export function writeTmp(dir, name, content) {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
