import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import sharp from "sharp";
import { randomBytes } from "node:crypto";
import { safeImage } from "../proposal-assets";
import { decodeDataUrl, MAX_FILE_BYTES } from "../storage/validation";
import { Packer } from "docx";
import { calculateSolar } from "../solar-calculator";
import { buildProposalDocument } from "../docx-builder";
import { buildProposalPdf } from "./generator";
import { extractEmbeddedPdfText } from "../pdf-text";
import type { ProposalDocumentInput } from "../proposal-types";

export function sampleProposal(): ProposalDocumentInput {
  const consumption = [0, 0, 540, 610, 590, 680, 700, 673, 0, 0, 0, 0];
  return { company: { name: "Solar Ficticia", primaryColor: "#123B5D", secondaryColor: "#287A68", accentColor: "#FF7A21", itbisRate: 0, proposalValidityDays: 15 }, customer: { name: "Cliente José Muñoz" }, project: { name: "Prueba", city: "Santiago", utility: "EDENORTE", tariff: "BTS-1", systemType: "On-Grid", panelWatts: 550, exchangeRate: 60 }, consumption, result: calculateSolar({ consumption, averageConsumption: 632.17, hsp: 4, oversizingFactor: 1.2, panelWatts: 550, costPerWpUsd: .9, exchangeRate: 60, utility: "EDENORTE", tariff: "BTS-1" }), quoteItems: [{ name: "Sistema", amountUsd: 1000 }], selectedEquipment: [{ name: "Solaria S550", type: "PANEL", brand: "Solaria", model: "S550", powerWatts: 550, quantity: 14, warrantyYears: 12 }, { name: "Voltix V8", type: "INVERTER", brand: "Voltix", model: "V8", powerWatts: 8000, quantity: 1, warrantyYears: 10 }] };
}
describe("proposal exports", () => {
  it("bounds PNG expansion of an otherwise valid compressed photograph", async () => {
    const jpeg = await sharp(randomBytes(1800 * 1800 * 3), { raw: { width: 1800, height: 1800, channels: 3 } }).jpeg({ quality: 75 }).toBuffer();
    const result = await safeImage(`data:image/jpeg;base64,${jpeg.toString("base64")}`);
    expect(result).toBeDefined(); expect(decodeDataUrl(result!).bytes.length).toBeLessThanOrEqual(MAX_FILE_BYTES);
  });
  it("builds PDF and editable DOCX with missing assets and zero tax", async () => {
    const input = sampleProposal(); input.company.logoBase64 = "data:image/png;base64,YmFk";
    const pdf = await buildProposalPdf(input);
    expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThanOrEqual(8);
    const text = await extractEmbeddedPdfText(pdf);
    expect(text).toContain("José Muñoz"); expect(text).toContain("US$ 1,000.00"); expect(text).toContain("Precio por Wp"); expect(text).toContain("632.17 kWh");
    expect(text).not.toMatch(/\b(?:null|undefined)\b/i); expect(text).not.toContain("Batería"); expect(text).not.toContain("Factura eléctrica");
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(9);
    const docx = await Packer.toBuffer(await buildProposalDocument(input));
    expect(docx.subarray(0, 2).toString()).toBe("PK"); expect(docx.length).toBeGreaterThan(5000);
    const archive = await JSZip.loadAsync(docx);
    const xml = await archive.file("word/document.xml")!.async("string");
    expect(xml).toContain("José Muñoz"); expect(xml).toContain("PRECIO POR Wp"); expect(xml).not.toContain("US$ 1,180.00");
  });
  it("paginates long quote rows without dropping final items or long descriptions", async () => {
    const input = sampleProposal();
    input.quoteItems = Array.from({ length: 65 }, (_, i) => ({ name: `Equipo ${i}`, description: `Descripción eléctrica ${"muy larga ".repeat(50)} final-${i}`, amountUsd: 100000000 }));
    input.proposalText = "Personalización especial. ".repeat(100);
    const pdf = await buildProposalPdf(input);
    const text = await extractEmbeddedPdfTextForTest(pdf);
    expect(text).toContain("Equipo 64"); expect(text).toContain("final-64");
    expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(8);
    const archive = await JSZip.loadAsync(await Packer.toBuffer(await buildProposalDocument(input)));
    expect(await archive.file("word/document.xml")!.async("string")).toContain("final-64");
  });
  it("includes valid annexes and marks damaged invoice without aborting", async () => {
    const input = sampleProposal();
    input.invoice = { name: "factura-ficticia.pdf", mimeType: "application/pdf", dataUrl: "data:application/pdf;base64,YmFk" };
    input.company.slogan = "Energía ☀ → CO₂";
    const annex = await PDFDocument.create(); const font = await annex.embedFont(StandardFonts.Helvetica);
    annex.addPage().drawText("Anexo ficticio verificable", { font });
    input.attachments = [{ equipmentName: "Panel ficticio", kind: "DATASHEET", fileName: "ficha.pdf", mimeType: "application/pdf", dataUrl: `data:application/pdf;base64,${Buffer.from(await annex.save()).toString("base64")}` }];
    const pdf = await buildProposalPdf(input);
    const text = await extractEmbeddedPdfText(pdf);
    expect(text).not.toContain("No se pudo incorporar"); expect(text).toContain("Datasheet · Panel ficticio"); expect(text).not.toContain("factura-ficticia.pdf");
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(10);
  });
  it("orders a valid invoice before datasheets and certificates", async () => {
    const input = sampleProposal();
    const annex = await PDFDocument.create(); const font = await annex.embedFont(StandardFonts.Helvetica);
    annex.addPage().drawText("Documento sintético", { font });
    const dataUrl = `data:application/pdf;base64,${Buffer.from(await annex.save()).toString("base64")}`;
    input.invoice = { name: "factura.pdf", mimeType: "application/pdf", dataUrl };
    input.attachments = [
      { equipmentName: "Panel", kind: "CERTIFICATE", fileName: "certificado.pdf", mimeType: "application/pdf", dataUrl },
      { equipmentName: "Panel", kind: "DATASHEET", fileName: "datasheet.pdf", mimeType: "application/pdf", dataUrl },
    ];
    const pdf = await buildProposalPdf(input);
    const text = await extractEmbeddedPdfText(pdf);

    expect(text.indexOf("Factura eléctrica")).toBeLessThan(text.indexOf("Datasheet · Panel"));
    expect(text.indexOf("Datasheet · Panel")).toBeLessThan(text.indexOf("Certificado · Panel"));
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(12);
  });
});

async function extractEmbeddedPdfTextForTest(bytes: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 });
  try { const pdf = await task.promise; const text: string[] = []; for (let i = 1; i <= pdf.numPages; i++) { const page = await pdf.getPage(i); text.push((await page.getTextContent()).items.map(item => "str" in item ? item.str : "").join(" ")); page.cleanup(); } return text.join("\n"); }
  finally { await task.destroy(); }
}
