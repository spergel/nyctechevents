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
      {
        source: '/feed',
        destination: '/api/rss',
        permanent: true,
      },
      {
        source: '/sitemap',
        destination: '/sitemap.xml',
        permanent: true,
      },
    ];
  },
  
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
          },
        ],
      },
    ];
  },

  // Enable experimental features for better SEO
  experimental: {
    // optimizeCss: true, // Temporarily disabled due to build issues
  },

  // Compress responses
  compress: true,

  // Enable trailing slash for consistency
  trailingSlash: false,
};

module.exports = nextConfig; 