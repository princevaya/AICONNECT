import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Set this to 10mb or whatever fits your needs
    },
  },
};

export default nextConfig;
