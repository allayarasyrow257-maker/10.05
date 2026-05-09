/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.16.*.*'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.*.*',
        port: '3001',
        pathname: '/uploads/**',
      },
    ],
  },
};

module.exports = nextConfig;
