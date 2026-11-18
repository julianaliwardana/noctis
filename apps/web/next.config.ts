import withPWA from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";
import { apiInternalUrl } from "./src/lib/apiInternalUrl";

/** /api/* is proxied to the API so cookies can be host-only. API_INTERNAL_URL is read at build (rewrite) and at runtime (server fetches). */

const nextConfig: NextConfig = {
  // PPR: static shell first, per-user data streams in. partialPrefetching prefetches only the shell.
  cacheComponents: true,
  partialPrefetching: true,
  // next-pwa needs webpack: dev runs Turbopack (PWA off), production builds pass --webpack.
  turbopack: {},
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiInternalUrl()}/:path*` }];
  },
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  // Keep /api/* out of the service worker cache, or finance and vault data would survive sign-out.
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
