import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // Strip "X-Powered-By: Next.js" (audit L3).
  poweredByHeader: false,
  async headers() {
    // Global security headers applied to every route. Intentionally omits a
    // strict Content-Security-Policy for now: Next 15's no-flash theme inline
    // script and the next/font inline <style> tag conflict with
    // `script-src 'self'` / `style-src 'self'` without nonces, and wiring
    // nonces through edge middleware is a separate task.
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default config;
