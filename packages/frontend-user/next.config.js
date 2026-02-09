/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@humory/shared', '@humory/editor'],
  eslint: {
    // Disable ESLint during build for now
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow build to succeed even with type errors for now
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  async rewrites() {
    const rewrites = [];
    // Only add API rewrite if NEXT_PUBLIC_API_URL is set
    if (process.env.NEXT_PUBLIC_API_URL) {
      rewrites.push({
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      });
    }
    return rewrites;
  },
  images: {
    domains: ['localhost', 'api.writehumanly.net'],
  },
};

module.exports = nextConfig;
