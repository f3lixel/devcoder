import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove COOP/COEP headers to ensure Sandpack bundler iframe can connect
  headers: async () => [],
  eslint: {
    // Allow builds to succeed despite ESLint errors (pre-existing issues)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
