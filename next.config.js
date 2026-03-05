/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['d3-scale', 'd3-scale-chromatic', 'd3-interpolate', 'd3-format', 'd3-time', 'd3-time-format', 'd3-array', 'd3-color'],
  images: {
    domains: [
      'images.unsplash.com',
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
        hostname: '**.rdcpix.com',
      },
      {
        protocol: 'http',
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
      {
        protocol: 'https',
        hostname: '**.realtor.com',
      },
      {
        protocol: 'https',
        hostname: '**.mredllc.com',
      },
    ],
  },
};

module.exports = nextConfig;
