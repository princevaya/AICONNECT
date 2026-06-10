// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        port: '',
        pathname: '/**',
      },
      // Add any other domains you use for images
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // For Google avatars
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com', // For GitHub avatars
        port: '',
        pathname: '/**',
      },
    ],
  },
  // ... other config options
};

module.exports = nextConfig;