/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@kitchzero/types', '@kitchzero/schemas', '@kitchzero/utils'],
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3001'
  }
};

module.exports = nextConfig;