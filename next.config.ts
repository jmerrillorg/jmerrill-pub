/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true, // ✅ Still good for Azure static hosting
  },
};

module.exports = nextConfig;