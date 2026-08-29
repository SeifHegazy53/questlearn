const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Module 10.5 / ADR 0005: the static, backend-free demo build,
// hosted on GitHub Pages. Entirely separate from DOCKER_BUILD above --
// this never touches output:"standalone" or any of Module 10.4's
// combined-runtime concerns. When unset (every other build: local
// dev, CI, the real Docker image), none of this file's behavior
// changes at all.
const isStaticDemo = process.env.STATIC_DEMO === "true";

// This is the actual browser-facing surface (apps/api's helmet CSP
// mostly guards a JSON API + Swagger UI, not real pages) so this is
// where the Google Fonts allowance matters: fonts.css @font-face rules
// point directly at fonts.gstatic.com woff2 files, no
// fonts.googleapis.com stylesheet involved, so only font-src needs the
// gstatic allowance -- not style-src or a <link> connect-src.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  `font-src 'self' https://fonts.gstatic.com`,
  `connect-src 'self' ${apiUrl}`,
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emits a self-contained .next/standalone server (a trimmed
  // node_modules + server.js) -- the officially recommended shape for
  // a Docker production image, see apps/web/Dockerfile, which sets
  // DOCKER_BUILD=1. Gated behind that flag (rather than always on)
  // because standalone's file-tracing step recreates pnpm's node_modules
  // symlink structure, which requires elevated privileges on Windows --
  // it works fine inside the Linux build container, but would otherwise
  // break every local `next build` on a non-elevated Windows dev machine.
  ...(process.env.DOCKER_BUILD ? { output: "standalone" } : {}),
  // Static export for GitHub Pages -- no server at all, so `headers()`
  // below (a real Next.js server feature) is skipped entirely rather
  // than silently ignored; GitHub Pages serves whatever static files
  // this produces with no custom header support of its own anyway.
  ...(isStaticDemo
    ? {
        output: "export",
        // Project page, not a user/org page -- served at
        // https://<user>.github.io/questlearn/, so every asset/link
        // needs that prefix baked in at build time.
        basePath: "/questlearn",
        assetPrefix: "/questlearn/",
        trailingSlash: true,
        images: { unoptimized: true },
        // The one and only difference reused pages see: `@/lib/api`
        // and `@/lib/auth-context` resolve to the mock modules
        // instead of the real ones. Every page/component's own source
        // is completely unmodified -- this is a path-resolution swap,
        // not a code change (see ADR 0005). A plain webpack
        // `resolve.alias` entry was tried first and did NOT work --
        // confirmed by a real build+browser check where the bundled
        // auth-context was still the real one (it made a live
        // `/backend/auth/refresh` fetch instead of reading the mock
        // role from localStorage) -- because Next's own tsconfig-paths
        // resolution for `@/*` runs ahead of/instead of a manually
        // added webpack alias for the same specifier. Pointing Next at
        // a dedicated tsconfig with a more specific `paths` entry for
        // exactly these two module specifiers is the mechanism Next
        // itself actually uses for `@/*`, so it reliably wins.
        typescript: { tsconfigPath: "tsconfig.static-demo.json" },
      }
    : {
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [
                { key: "Content-Security-Policy", value: csp },
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "X-Frame-Options", value: "DENY" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
              ],
            },
          ];
        },
      }),
};

module.exports = nextConfig;
