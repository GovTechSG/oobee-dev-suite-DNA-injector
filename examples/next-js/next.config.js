const { withOobeeDNA } = require('@govtechsg/oobee-genome/adapters/next');

const nextConfig = {
    reactStrictMode: true,
};

module.exports = withOobeeDNA(nextConfig, {
    verbose: true,
    enabled: true
});
