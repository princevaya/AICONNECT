/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Add support for pnpm symlinks
    config.resolve.symlinks = false;
    return config;
  },
  // Optional: Add transpilePackages if needed
  transpilePackages: [],
}

module.exports = nextConfig