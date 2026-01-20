import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    qualities: [100, 25, 50, 75],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
