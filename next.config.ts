import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Explicitly set the workspace root so Next.js doesn't pick up a
  // lockfile from a parent directory and emit the detection warning.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    qualities: [100, 75],
  },
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "@prisma/adapter-pg",
    "pg",
    "pg-cloudflare",
    "pg-native",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack: (config) => {
    // Required for pnpm symlink resolution
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
