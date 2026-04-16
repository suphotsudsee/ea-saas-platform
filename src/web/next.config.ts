/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.stripe.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/ea/:path*',
        destination: `${process.env.API_URL}/api/ea/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
