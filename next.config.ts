/*
FILE:      next.config.ts
CREATED:   2026-11-15 10:26 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Next.js config: redirect / to /en, keep pg out of the bundle.
WHY:       Language lives in the URL (/en, /ar); pg is a Node package.
*/
import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["pg", "kwtsms"],
  async redirects() {
    return [{ source: "/", destination: "/en", permanent: false }];
  },
};

export default config;
