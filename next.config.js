/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'images.unsplash.com',
      'photos.zillowstatic.com',
      'maps.googleapis.com',
      'ssl.cdn-redfin.com',
      'ap.rdcpix.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.zillowstatic.com',
      },
      {
        protocol: 'https',
        hostname: '**.rdcpix.com',
      },
      {
        protocol: 'https',
        hostname: '**.cdn-redfin.com',
      },
      {
        protocol: 'https',
        hostname: '**.hdnux.com',
      },
    ],
  },
};

module.exports = nextConfig;
