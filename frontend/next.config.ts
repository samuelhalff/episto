import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const distDir = process.env.NEXT_DIST_DIR || ".next";
const watchPollInterval = Number.parseInt(
  process.env.WATCHPACK_POLLING_INTERVAL ?? "1000",
  10,
);

// Security headers — values locked in docs/07-operations/security-and-privacy.md §Security headers
// CSP includes Stripe domains as required by docs (script-src, frame-src, connect-src).
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "0" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js dev mode requires 'unsafe-eval' for source maps and HMR.
      // In production, remove 'unsafe-eval' and use nonces instead.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      // ws:/wss: needed for HMR WebSocket in dev; EventSource SSE is same-origin.
      "connect-src 'self' https://api.stripe.com ws: wss:",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  distDir,
  allowedDevOrigins: ["ark-fid.ddns.net"],
  experimental: {
    serverComponentsHmrCache: false,
  },
  webpack(config, { dev }) {
    // Resolve .js extension imports to .ts/.tsx files in the stable webpack toolchain.
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts", ".tsx"],
      ".jsx": [".jsx", ".tsx"],
    };

    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: Number.isFinite(watchPollInterval) ? watchPollInterval : 1000,
        aggregateTimeout: 300,
      };
    }

    return config;
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.API_URL || "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
