import type { NextConfig } from "next";

// STATIC_EXPORT=1 (netlify.toml, docs/deploy.md): a static site in dist/client for Netlify. Without it the build is the
// old Cloudflare worker one, unchanged.
const nextConfig: NextConfig = {
  ...(process.env.STATIC_EXPORT ? { output: "export" as const, trailingSlash: true } : {}),
};

export default nextConfig;
