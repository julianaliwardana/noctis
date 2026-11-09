import withPWA from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

/**
 * The browser only ever talks to this origin; /api/* is proxied to the Fastify API on the internal
 * network. Same-origin is what lets the session cookies be host-only (`__Host-`) instead of being
 * scoped to the parent domain, where every sibling subdomain would receive them too.
 *
 * Rewrites are resolved at `next build`, so API_INTERNAL_URL is a build arg in the Dockerfile.
 * Default: the compose service name in production, the local API in dev.
 */
const apiInternalUrl = (
  process.env.API_INTERNAL_URL ||
  (process.env.NODE_ENV === "production" ? "http://api:3001" : "http://localhost:3001")
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiInternalUrl}/:path*` }];
  },
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  // The default "apis" rule would keep up to a day of /api/* responses (finances, vault items,
  // profile) in the service worker cache, surviving sign-out. Same cacheName replaces it.
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: ({ sameOrigin, url: { pathname } }) => sameOrigin && pathname.startsWith("/api/"),
        handler: "NetworkOnly",
        options: { cacheName: "apis" },
      },
    ],
  },
})(nextConfig);
