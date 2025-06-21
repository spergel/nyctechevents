/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/rss',
        destination: '/api/rss',
        permanent: true,
      },
      {
        source: '/ics',
        destination: '/api/ics',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig; 