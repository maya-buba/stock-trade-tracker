import type { NextConfig } from "next";

/**
 * The app is entirely client-side, so it ships as a static export and can be
 * hosted anywhere. On GitHub Pages the site lives under a repository path, so
 * the deploy workflow sets NEXT_PUBLIC_BASE_PATH; locally it stays empty.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
