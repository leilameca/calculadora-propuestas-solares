import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const puppeteer = require("../.tmp/docx-tools/node_modules/puppeteer-core");

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  throw new Error("Usage: node scripts/render-html-pages.mjs <input.html> <output-dir>");
}

const inputPath = path.resolve(inputArg);
const outputDir = path.resolve(outputArg);
await fs.mkdir(outputDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--disable-gpu", "--allow-file-access-from-files"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1900, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(inputPath).href, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  const sheets = await page.$$(".sheet");
  const evidence = [];
  for (let index = 0; index < sheets.length; index += 1) {
    const sheet = sheets[index];
    const filename = `page-${String(index + 1).padStart(2, "0")}.png`;
    await sheet.screenshot({ path: path.join(outputDir, filename) });
    const metrics = await sheet.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      text: element.innerText,
    }));
    evidence.push({ page: index + 1, filename, ...metrics });
  }
  await fs.writeFile(
    path.join(outputDir, "render-evidence.json"),
    JSON.stringify({ inputPath, pageCount: sheets.length, pages: evidence }, null, 2),
    "utf8",
  );
  process.stdout.write(JSON.stringify({ inputPath, outputDir, pageCount: sheets.length }));
} finally {
  await browser.close();
}
