// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // ✅ Required for Azure static deploy
  },
};

module.exports = nextConfig;