// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // ✅ disables image optimization API
  },
};

module.exports = nextConfig;