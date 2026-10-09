// Fail-closed development-build detector shared by every bundler adapter.
//
// injectDNA embeds source-file paths, DOM structure, and source line/column
// coordinates into every transformed element. That metadata is useful only
// in local development — shipping it into a production bundle leaks internal
// layout to any end user who inspects the DOM/source. Every adapter runs
// this gate, including vite on top of `apply: 'serve'` (which only excludes
// `vite build`, not a dev server under NODE_ENV=production or CI).
//
// This helper is the shared gate. It fails *closed*: any positive
// production signal returns false, and the only way to opt back in from an
// otherwise-production environment is a deliberate two-key acknowledgement.
//
// Production signals checked (any one returns false):
//   NODE_ENV=production
//   CI / CONTINUOUS_INTEGRATION set to anything but ''/false/0 (any CI runner)
//   NEXT_PHASE=phase-production-build|phase-production-server  (Next.js)
//   VERCEL_ENV=production|preview     (Vercel)
//
// Escape hatch (must set BOTH):
//   OOBEE_DNA_FORCE=1
//   OOBEE_DNA_FORCE_ACK=i-understand-this-leaks-paths
//
// A single-var override (as the original next.js adapter had) is too easy
// to leave set in a staging environment and silently re-enable the leak.
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

    // Ambient bundler/deploy signals — these are authoritative and can't be
    // overridden by the escape hatch (a developer who sets OOBEE_DNA_FORCE
    // and forgets it should not be able to leak paths into a Vercel prod
    // deployment).
    if (nextPhase === 'phase-production-build' || nextPhase === 'phase-production-server') return false;
    if (vercelEnv === 'production' || vercelEnv === 'preview') return false;
    if (isCiEnvironment()) return false;

    // A bundler-reported mode (webpack's this.mode / config.mode) is
    // authoritative: a production build never injects, even with the force
    // override, and `webpack --mode development` needs no NODE_ENV.
    if (bundlerMode !== undefined && bundlerMode !== 'development') return false;

    // Two-key opt-in escape hatch. Overrides NODE_ENV so a developer who
    // deliberately wants to inspect a production-mode local build can
    // re-enable the injector by acknowledging what it leaks. Must set BOTH
    // vars — a single flag left behind in a shared shell cannot re-enable.
    if (
        process.env.OOBEE_DNA_FORCE === '1' &&
        process.env.OOBEE_DNA_FORCE_ACK === 'i-understand-this-leaks-paths'
    ) {
        return true;
    }

    if (bundlerMode === 'development') return nodeEnv !== 'production';
    return nodeEnv === 'development';
}

export { isDevelopmentBuild };
