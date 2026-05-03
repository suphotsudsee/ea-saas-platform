/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config, { isServer, dev }) => {
    // Only alias @prisma/client to stub in local dev with JSON fallback.
    // In production Docker, use the real Prisma client (installed via npm ci).
    if (dev && process.env.USE_PRISMA_STUB !== 'false') {
      config.resolve.alias['@prisma/client'] = path.resolve(__dirname, 'src/types/prisma-stub.ts');
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
  },
  async redirects() {
    return [
      {
        source: '/pricing',
        destination: '/?section=pricing',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net https://www.google-analytics.com",
              "img-src 'self' data: https: blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://connect.facebook.net https://graph.facebook.com https://api.stripe.com",
              "frame-src https://www.googletagmanager.com https://js.stripe.com https://hooks.stripe.com",
              "form-action 'self'",
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/ea/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, X-API-Key, X-License-Key' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
