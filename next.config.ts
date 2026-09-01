import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The AI route handlers cap their own body size; this is a second guard.
  experimental: {
    serverActions: { bodySizeLimit: '1mb' },
  },
};

export default nextConfig;
