import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Explicitly set the workspace root so Next.js doesn't pick up a
  // lockfile from a parent directory and emit the detection warning.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },
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
      bodySizeLimit: "500mb",
    },
    middlewareClientMaxBodySize: "500mb",
    proxyClientMaxBodySize: "500mb",
  },
  webpack: (config) => {
    // Required for pnpm symlink resolution
    config.resolve.symlinks = false;
    return config;
  },
  async rewrites() {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

    // When deployed on Vercel, proxy all /api requests to the Render backend.
    // Keep this unset on backend/local deployments to use local app/api routes.
    if (!apiBaseUrl) return [];

    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${apiBaseUrl}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
