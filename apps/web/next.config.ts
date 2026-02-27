import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: [],
  },
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  // Configure webpack for Monaco Editor
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Monaco Editor needs these for web workers
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net;
              style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
              img-src 'self' data: https:;
              connect-src 'self' https://api.cerebras.ai https://1rpc.io/sepolia https://1rpc.io https://*.1rpc.io https://eth-sepolia.g.alchemy.com https://*.alchemy.com https://cdn.jsdelivr.net http://localhost:3001 http://localhost:* ws://localhost:*;
              font-src 'self' https://cdn.jsdelivr.net data:;
              object-src 'none';
              base-uri 'self';
              frame-src 'self' blob:;
              worker-src 'self' blob: data:;
              form-action 'self';
              frame-ancestors 'none';
            `.replace(/\s{2,}/g, ' ').trim(),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  // output: 'export', // Uncomment for static export
  // distDir: 'dist', // Uncomment for static export
};

export default nextConfig;
