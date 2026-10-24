import type { NextConfig } from "next";

const nextConfig: any = {
  output: 'standalone',
  // Hides Next's own floating dev badge. It is not part of the app - it only
  // exists in `next dev` - but it sits on top of the mobile bottom bar and its
  // drag handler throws "releasePointerCapture ... no active pointer" into the
  // console, which looks like an app error and is not one.
  devIndicators: false,
  /*
   * Next 16 refuses to serve its dev-only resources (/_next/*, the HMR
   * socket) to any origin except localhost, and answers everything else with
   * "Blocked cross-origin request to Next.js dev resource". That is why the
   * site opened on a phone at http://192.168.1.11:3000 but never came alive:
   * the HTML arrived and every script behind it was refused.
   *
   * These hosts are the machine itself, reached by its other names. The
   * setting exists only in `next dev` - `next build` / `next start` ignore it
   * entirely, so nothing here reaches production.
   *
   * The LAN address comes from DHCP, so if the router hands out a different
   * one this list needs the new value (run `ipconfig` to see it).
   */
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.1.11',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const backend = process.env.API_PROXY_URL || 'http://localhost:5000';
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
      {
        // Images saved by the backend's local-disk fallback, used when R2 is
        // not configured. They come back as /uploads/... so the browser asks
        // this site for them; without this they would 404, because the files
        // live on the API server, not here. With R2 configured the URLs are
        // absolute and never reach this rule.
        source: '/uploads/:path*',
        destination: `${backend}/uploads/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
