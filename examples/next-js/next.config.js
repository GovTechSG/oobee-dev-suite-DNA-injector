const { withOobeeDNA } = require('@oobee/oobee-genome/adapters/next');

const nextConfig = {
    reactStrictMode: true,
};

module.exports = withOobeeDNA(nextConfig, {
    verbose: true,
    enabled: true
});
