import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "/*": ["**/.vault-data/**", "**/*.sqlite", "**/*.sqlite-*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  turbopack: {
    root: __dirname,
  },
  async headers() {
    const privateHeaders = [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
    ];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      ...[
        "/vault/:path*",
        "/share/:path*",
        "/invite/:path*",
        "/login",
        "/signup",
        "/api/vault/:path*",
        "/api/share/:path*",
      ].map((source) => ({
        source,
        headers: privateHeaders,
      })),
    ];
  },
};

export default nextConfig;
