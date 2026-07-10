import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Proxy /api/admin/* to the real backend. Requires BACKEND_API_URL to be set.
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL;
    if (!backendUrl) {
      return [];
    }
    return [
      {
        source: "/api/admin/:path*",
        destination: `${backendUrl}/api/admin/:path*`,
      },
    ];
  },
};

export default nextConfig;
