const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['@humory/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_TRACKER_URL: process.env.NEXT_PUBLIC_TRACKER_URL,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },
  images: {
    domains: ['localhost'],
  },
  webpack: (config) => {
    // Exact match: import from '@humory/shared'
    config.resolve.alias['@humory/shared$'] = path.resolve(__dirname, '../shared/src/index.ts');
    // Subpath match: import from '@humory/shared/types/...'
    config.resolve.alias['@humory/shared'] = path.resolve(__dirname, '../shared/src');
    // Ensure root node_modules is searchable (for zod and other deps)
    config.resolve.modules = [
      path.resolve(__dirname, '../../node_modules'),
      ...(config.resolve.modules || ['node_modules']),
    ];
    return config;
  },
};

module.exports = nextConfig;
