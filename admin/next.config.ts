import type { NextConfig } from "next";

// Share the single repo-root `.env`. A per-app `admin/.env.local` can still
// override individual keys.
try {
  process.loadEnvFile("../.env");
} catch {
  // root .env is optional (e.g. CI injects env directly)
}

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
