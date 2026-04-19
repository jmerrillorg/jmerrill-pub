/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow jmerrill.pub logo from live site during development
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.jmerrill.pub',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'covers3.booksamillion.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dynamic.indigoimages.ca',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images-us.bookshop.org',
        pathname: '/**',
      },
    ],
  },

  // Redirect /pricing → /packages (canonical URL)
  async redirects() {
    return [
      {
        source: '/pricing',
        destination: '/packages',
        permanent: true,
      },
      {
        source: '/services-catalog',
        destination: '/services',
        permanent: true,
      },
    ]
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',       value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
          { key: 'X-JM1-Division',         value: 'publishing-01' },
        ],
      },
    ]
  },
}

export default nextConfig
