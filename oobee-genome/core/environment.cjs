// CommonJS twin of environment.js. Keep the two in lockstep — the whole
// point of this file is to close the fail-open gap in the CJS-consumed
// adapters (rollup.cjs/webpack.cjs/angular.cjs), so a fix that only lands
// on the ESM twin would leave the CJS consumers unprotected exactly the
// way transformer.cjs was.
// CI runners spell the flag differently (`true`, `True`, `1`, a build number),
// and some only set CONTINUOUS_INTEGRATION. Any value other than an explicit
// "off" counts as CI.
function isCiEnvironment() {
    for (const name of ['CI', 'CONTINUOUS_INTEGRATION']) {
        const value = String(process.env[name] || '').trim().toLowerCase();
        if (value !== '' && value !== 'false' && value !== '0') return true;
    }
    return false;
}

function isDevelopmentBuild(bundlerMode) {
    const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
    const nextPhase = String(process.env.NEXT_PHASE || '');
    const vercelEnv = String(process.env.VERCEL_ENV || '').toLowerCase();

    if (nextPhase === 'phase-production-build' || nextPhase === 'phase-production-server') return false;
    if (vercelEnv === 'production' || vercelEnv === 'preview') return false;
    if (isCiEnvironment()) return false;

    // A bundler-reported mode (webpack's this.mode / config.mode) is
    // authoritative: a production build never injects, even with the force
    // override, and `webpack --mode development` needs no NODE_ENV.
    if (bundlerMode !== undefined && bundlerMode !== 'development') return false;

    if (
        process.env.OOBEE_DNA_FORCE === '1' &&
        process.env.OOBEE_DNA_FORCE_ACK === 'i-understand-this-leaks-paths'
    ) {
        return true;
    }

    if (bundlerMode === 'development') return nodeEnv !== 'production';
    return nodeEnv === 'development';
}

module.exports = { isDevelopmentBuild };
