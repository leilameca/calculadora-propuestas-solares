import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: {
    "/api/proposals/docx": ["./node_modules/pdfjs-dist/standard_fonts/**/*"],
    "/api/ocr": [
      "./node_modules/pdfjs-dist/legacy/build/**/*",
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
      "./node_modules/tesseract.js/src/**/*",
      "./node_modules/tesseract.js-core/**/*",
    ],
  },
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "tesseract.js", "tesseract.js-core"],
};

export default nextConfig;
