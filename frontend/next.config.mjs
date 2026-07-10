import createNextIntlPlugin from "next-intl/plugin";

// Share the single repo-root `.env` with the backend/admin. Loaded before Next's
// own env files so the root file is the common base; a per-app
// `frontend/.env.local` can still override individual keys.
try {
  process.loadEnvFile("../.env");
} catch {
  // root .env is optional (e.g. CI injects env directly)
}

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/": ["./messages/**/*", "./i18n/**/*"],
  },
  reactStrictMode: true,
  /** Baseline headers when the app is not fronted by nginx (e.g. local dev, some hosts). */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value:
              "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
          }
        ]
      }
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**"
      }
    ]
  }
};

export default withNextIntl(nextConfig);
