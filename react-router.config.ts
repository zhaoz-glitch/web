import type { Config } from "@react-router/dev/config";

// GitHub Pages serves this repo under /web/. When building for Pages we
// set the router basename (and the matching Vite base in vite.config.ts)
// so routes resolve correctly under the sub-path.
// NOTE: basename must end with a trailing slash.
const PAGES_BASE = process.env.GITHUB_PAGES === "true" ? "/web/" : "/";

export default {
  // SPA mode: GitHub Pages is static hosting and cannot run the Node
  // SSR server, so we build a client-only bundle instead.
  ssr: false,
  // Router basename — must match the Vite `base` in vite.config.ts.
  basename: PAGES_BASE,
} satisfies Config;
