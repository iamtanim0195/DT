/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['openweathermap.org'],
  },
  eslint: {
    ignoreDuringBuilds: true, // Only if you want to bypass ESLint during build
  },
  typescript: {
    ignoreBuildErrors: true, // Only if you want to bypass TypeScript errors during build
  }
};

module.exports = nextConfig;