import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const puppeteer = require("../.tmp/docx-tools/node_modules/puppeteer-core");

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) throw new Error("Usage: node render-pdf-browser.mjs <input.pdf> <output-dir>");

const inputPath = path.resolve(inputArg);
const outputDir = path.resolve(outputArg);
const pdfScriptPath = path.resolve(".tmp/pdf-tools/node_modules/pdfjs-dist/build/pdf.js");
const pdfWorkerScriptPath = path.resolve(".tmp/pdf-tools/node_modules/pdfjs-dist/build/pdf.worker.js");
await fs.mkdir(outputDir, { recursive: true });
const pdfBase64 = (await fs.readFile(inputPath)).toString("base64");

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--disable-gpu"],
});

try {
  const browserPage = await browser.newPage();
  await browserPage.setViewport({ width: 1800, height: 2400, deviceScaleFactor: 1 });
  await browserPage.setContent('<!doctype html><html><body style="margin:0;background:#d9dde3"><canvas id="pdf" style="display:block;margin:24px auto;background:white;box-shadow:0 8px 24px #0003"></canvas></body></html>');
  await browserPage.addScriptTag({ path: pdfWorkerScriptPath });
  await browserPage.addScriptTag({ path: pdfScriptPath });
  const pageCount = await browserPage.evaluate(async (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    window.__pdfDocument = await window.pdfjsLib.getDocument({ data: bytes, disableWorker: true }).promise;
    return window.__pdfDocument.numPages;
  }, pdfBase64);

  const pages = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const evidence = await browserPage.evaluate(async (number) => {
      const pdfPage = await window.__pdfDocument.getPage(number);
      const viewport = pdfPage.getViewport({ scale: 2 });
      const canvas = document.getElementById("pdf");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / 2}px`;
      canvas.style.height = `${viewport.height / 2}px`;
      const context = canvas.getContext("2d", { alpha: false });
      await pdfPage.render({ canvasContext: context, viewport }).promise;
      const textContent = await pdfPage.getTextContent();
      return {
        width: viewport.width,
        height: viewport.height,
        text: textContent.items.map((item) => item.str).join(" "),
      };
    }, pageNumber);
    const canvas = await browserPage.$("#pdf");
    const filename = `page-${String(pageNumber).padStart(2, "0")}.png`;
    await canvas.screenshot({ path: path.join(outputDir, filename) });
    pages.push({ page: pageNumber, filename, ...evidence });
  }

  await fs.writeFile(
    path.join(outputDir, "render-evidence.json"),
    JSON.stringify({ inputPath, pageCount, pages }, null, 2),
    "utf8",
  );
  process.stdout.write(JSON.stringify({ inputPath, outputDir, pageCount }));
} finally {
  await browser.close();
}
