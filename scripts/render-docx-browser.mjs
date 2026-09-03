import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const puppeteer = require("../.tmp/docx-tools/node_modules/puppeteer-core");

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  throw new Error("Usage: node scripts/render-docx-browser.mjs <input.docx> <output-dir>");
}

const inputPath = path.resolve(inputArg);
const outputDir = path.resolve(outputArg);
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const previewScriptPath = path.resolve(
  ".tmp/docx-tools/node_modules/docx-preview/dist/docx-preview.min.js",
);
const zipScriptPath = path.resolve(
  ".tmp/docx-tools/node_modules/jszip/dist/jszip.min.js",
);

await fs.mkdir(outputDir, { recursive: true });
const documentBase64 = (await fs.readFile(inputPath)).toString("base64");

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--disable-gpu", "--allow-file-access-from-files"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1900, deviceScaleFactor: 2 });
  await page.setContent(`<!doctype html>
    <html><head><meta charset="utf-8"><style>
      html,body{margin:0;background:#d9dde3;font-family:Arial,sans-serif}
      #document{padding:40px 0}
      .docx-wrapper{background:transparent!important;padding:0!important}
      section.docx{margin:0 auto 40px!important;box-shadow:0 8px 24px rgba(15,23,42,.2)!important}
    </style></head><body><main id="document"></main></body></html>`, { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ path: zipScriptPath });
  await page.addScriptTag({ path: previewScriptPath });
  await page.evaluate(async (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    await window.docx.renderAsync(bytes.buffer, document.getElementById("document"), null, {
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
      useBase64URL: true,
    });
  }, documentBase64);
  await page.evaluate(() => document.fonts.ready);

  const sections = await page.$$("section.docx");
  const evidence = [];
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const filename = `page-${String(index + 1).padStart(2, "0")}.png`;
    const outputPath = path.join(outputDir, filename);
    await section.screenshot({ path: outputPath });
    const metrics = await section.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      text: element.innerText,
    }));
    evidence.push({ page: index + 1, filename, ...metrics });
  }
  await fs.writeFile(
    path.join(outputDir, "render-evidence.json"),
    JSON.stringify({ inputPath, pageCount: sections.length, pages: evidence }, null, 2),
    "utf8",
  );
  process.stdout.write(JSON.stringify({ inputPath, outputDir, pageCount: sections.length }));
} finally {
  await browser.close();
}
