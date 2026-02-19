import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      bodySizeLimit: "10mb", // Set this to 10mb or whatever fits your needs
    },
  },
};

export default nextConfig;
