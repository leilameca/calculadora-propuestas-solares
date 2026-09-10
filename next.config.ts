import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: { "/api/proposals/docx": ["./node_modules/pdfjs-dist/standard_fonts/**/*"], "/api/ocr": ["./node_modules/pdfjs-dist/standard_fonts/**/*"] },
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
