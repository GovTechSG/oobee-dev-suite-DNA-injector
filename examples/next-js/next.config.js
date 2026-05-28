const { withOobeeDNA } = require('oobee-genome/adapters/next');

const nextConfig = {
    reactStrictMode: true,
};

module.exports = withOobeeDNA(nextConfig, {
    verbose: true,
    enabled: true
});
