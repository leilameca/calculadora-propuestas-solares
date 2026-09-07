import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
