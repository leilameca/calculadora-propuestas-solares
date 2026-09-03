import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const JSZip = require("../.tmp/docx-tools/node_modules/jszip");

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  throw new Error("Usage: node scripts/inspect-docx-ooxml.mjs <input.docx> <output.json>");
}

const decodeXml = (value) => value
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", '"')
  .replaceAll("&apos;", "'");

const buffer = await fs.readFile(path.resolve(inputArg));
const zip = await JSZip.loadAsync(buffer);
const documentXml = await zip.file("word/document.xml").async("string");
const stylesXml = await zip.file("word/styles.xml")?.async("string");
const settingsXml = await zip.file("word/settings.xml")?.async("string");
const paragraphMatches = [...documentXml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)];
const paragraphs = paragraphMatches.map((match, index) => {
  const xml = match[0];
  const text = [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
    .map((item) => decodeXml(item[1]))
    .join("");
  const style = xml.match(/<w:pStyle\s+w:val="([^"]+)"/i)?.[1] ?? null;
  return {
    index,
    text,
    style,
    pageBreaks: (xml.match(/<w:br\s+w:type="page"\s*\/>/g) ?? []).length,
    sectionBreak: /<w:sectPr(?:\s|>)/.test(xml),
    inTable: documentXml.lastIndexOf("<w:tbl", match.index) > documentXml.lastIndexOf("</w:tbl>", match.index),
  };
});

const files = await Promise.all(Object.values(zip.files).filter((file) => !file.dir).map(async (file) => ({
  path: file.name,
  size: (await file.async("uint8array")).byteLength,
})));

const evidence = {
  inputPath: path.resolve(inputArg),
  sha256: await (async () => {
    const crypto = await import("node:crypto");
    return crypto.createHash("sha256").update(buffer).digest("hex");
  })(),
  packageParts: files,
  paragraphs,
  counts: {
    packageParts: files.length,
    paragraphs: paragraphs.length,
    explicitPageBreaks: (documentXml.match(/<w:br\s+w:type="page"\s*\/>/g) ?? []).length,
    renderedPageBreaks: (documentXml.match(/<w:lastRenderedPageBreak\s*\/>/g) ?? []).length,
    sections: (documentXml.match(/<w:sectPr(?:\s|>)/g) ?? []).length,
    tables: (documentXml.match(/<w:tbl(?:\s|>)/g) ?? []).length,
    drawings: (documentXml.match(/<w:drawing(?:\s|>)/g) ?? []).length,
    textBoxes: (documentXml.match(/<w:txbxContent(?:\s|>)/g) ?? []).length,
    comments: (documentXml.match(/<w:commentReference(?:\s|>)/g) ?? []).length,
    trackedInsertions: (documentXml.match(/<w:ins(?:\s|>)/g) ?? []).length,
    trackedDeletions: (documentXml.match(/<w:del(?:\s|>)/g) ?? []).length,
  },
  styleIds: stylesXml ? [...stylesXml.matchAll(/<w:style[^>]+w:styleId="([^"]+)"/g)].map((m) => m[1]) : [],
  updateFieldsOnOpen: settingsXml ? /<w:updateFields\s+w:val="(?:true|1)"\s*\/>/.test(settingsXml) : false,
};

await fs.mkdir(path.dirname(path.resolve(outputArg)), { recursive: true });
await fs.writeFile(path.resolve(outputArg), JSON.stringify(evidence, null, 2), "utf8");
process.stdout.write(JSON.stringify(evidence.counts));
