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
  // In production the admin dashboard is served at /admin via nginx.
  // Set NEXT_PUBLIC_BASE_PATH=/admin as a Docker build arg before building.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  transpilePackages: ['@humory/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_TRACKER_URL: process.env.NEXT_PUBLIC_TRACKER_URL,
  },
  async rewrites() {
    // Only proxy /api/* in local dev. In production, nginx routes /api/ directly
    // to the backend and NEXT_PUBLIC_API_URL is an absolute https:// URL.
    if (process.env.NODE_ENV === 'production') return [];
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },
  images: {
    domains: ['localhost', 'yourdomain.com'],
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
