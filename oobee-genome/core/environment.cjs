// CommonJS twin of environment.js. Keep the two in lockstep — the whole
// point of this file is to close the fail-open gap in the CJS-consumed
// adapters (rollup.cjs/webpack.cjs/angular.cjs), so a fix that only lands
// on the ESM twin would leave the CJS consumers unprotected exactly the
// way transformer.cjs was.
function isDevelopmentBuild() {
    const nodeEnv = String(process.env.NODE_ENV || '').trim().toLowerCase();
    const nextPhase = String(process.env.NEXT_PHASE || '');
    const vercelEnv = String(process.env.VERCEL_ENV || '').toLowerCase();

    if (nextPhase === 'phase-production-build' || nextPhase === 'phase-production-server') return false;
    if (vercelEnv === 'production' || vercelEnv === 'preview') return false;
    if (process.env.CI === 'true' || process.env.CI === '1') return false;

    if (
        process.env.OOBEE_DNA_FORCE === '1' &&
        process.env.OOBEE_DNA_FORCE_ACK === 'i-understand-this-leaks-paths'
    ) {
        return true;
    }

    return ['dev', 'test', 'ci'].some((prefix) => nodeEnv.startsWith(prefix));
}

module.exports = { isDevelopmentBuild };
