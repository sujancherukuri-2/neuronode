import type { NextConfig } from "next";

const isPages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: isPages ? "export" : undefined,
  trailingSlash: isPages,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: isPages,
  },
  eslint: {
    ignoreDuringBuilds: isPages,
  },
  typescript: {
    ignoreBuildErrors: isPages,
  },
};

export default nextConfig;
