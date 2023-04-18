/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        config.experiments = {
            asyncWebAssembly: true,
            layers: true,
            topLevelAwait: true,
        }
        return config
    }
}

module.exports = nextConfig

