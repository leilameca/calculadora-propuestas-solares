import { mkdir } from "node:fs/promises";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { createWorker } from "tesseract.js";
import { renderPdfPages } from "../lib/pdf-images";
import { parseUtilityBill } from "../lib/utility-bill/parser";
import { edenorteFixture } from "../lib/utility-bill/fixtures";

async function main() {
  const pdf = await PDFDocument.create(), page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  edenorteFixture.split("\n").forEach((line, i) => page.drawText(line, { x: 40, y: 750 - i * 25, font, size: 12 }));
  const [image] = await renderPdfPages(await pdf.save(), 1, 2);
  await mkdir("tmp/tesseract", { recursive: true });
  const worker = await createWorker("spa", 1, { cachePath: "tmp/tesseract" });
  try {
    const bill = parseUtilityBill((await worker.recognize(image)).data.text);
    console.info(JSON.stringify({ utility: bill.utility, months: bill.consumptionHistory.length, confidence: bill.confidence }));
    if (bill.utility !== "EDENORTE" || bill.consumptionHistory.length !== 12) throw new Error("El OCR sintético no recuperó los 12 meses.");
  } finally { await worker.terminate(); }
}
main().catch(error => { console.error("invoice_ocr_check_failed", { type: error instanceof Error ? error.name : "unknown" }); process.exitCode = 1; });
