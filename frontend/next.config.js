/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fix for resolving ESM modules in node_modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    // Ensure proper module resolution for ESM packages
    // This helps Next.js resolve ESM modules correctly
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });
    
    // Ensure webpack properly resolves packages with exports field
    config.resolve.conditionNames = ['require', 'node', 'default'];
    
    return config;
  },
};

module.exports = nextConfig;
