import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { Packer } from "docx";
import { calculateSolar } from "../solar-calculator";
import { buildProposalDocument } from "../docx-builder";
import { buildProposalPdf } from "./generator";
import { extractEmbeddedPdfText } from "../pdf-text";
import type { ProposalDocumentInput } from "../proposal-types";

export function sampleProposal(): ProposalDocumentInput {
  const consumption = Array(12).fill(400) as number[];
  return { company: { name: "Solar Ficticia", primaryColor: "#0F4C5C", secondaryColor: "#2F7D32", accentColor: "#F2A900", itbisRate: 0 }, customer: { name: "Cliente José Muñoz" }, project: { name: "Prueba", city: "Santiago", utility: "EDENORTE", tariff: "BTS-1", systemType: "On-Grid", panelWatts: 550, exchangeRate: 60 }, consumption, result: calculateSolar({ consumption, hsp: 4, oversizingFactor: 1.2, panelWatts: 550, costPerWpUsd: .9, exchangeRate: 60, utility: "EDENORTE", tariff: "BTS-1" }), quoteItems: [{ name: "Sistema", amountUsd: 1000 }] };
}
describe("proposal exports", () => {
  it("builds PDF and editable DOCX with missing assets and zero tax", async () => {
    const input = sampleProposal(); input.company.logoBase64 = "data:image/png;base64,YmFk";
    const pdf = await buildProposalPdf(input);
    expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThanOrEqual(8);
    const text = await extractEmbeddedPdfText(pdf);
    expect(text).toContain("José Muñoz"); expect(text).toContain("US$ 1,000.00");
    const docx = await Packer.toBuffer(await buildProposalDocument(input));
    expect(docx.subarray(0, 2).toString()).toBe("PK"); expect(docx.length).toBeGreaterThan(5000);
  });
  it("paginates long quote rows without dropping final items or long descriptions", async () => {
    const input = sampleProposal();
    input.quoteItems = Array.from({ length: 65 }, (_, i) => ({ name: `Equipo ${i}`, description: `Descripción eléctrica ${"muy larga ".repeat(50)} final-${i}`, amountUsd: 100000000 }));
    input.proposalText = "Personalización especial. ".repeat(100);
    const pdf = await buildProposalPdf(input);
    const text = await extractEmbeddedPdfTextForTest(pdf);
    expect(text).toContain("Equipo 64"); expect(text).toContain("final-64");
    expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(8);
  });
  it("includes valid annexes and marks damaged invoice without aborting", async () => {
    const input = sampleProposal();
    input.invoice = { name: "factura-ficticia.pdf", mimeType: "application/pdf", dataUrl: "data:application/pdf;base64,YmFk" };
    input.company.slogan = "Energía ☀ → CO₂";
    const text = await extractEmbeddedPdfText(await buildProposalPdf(input));
    expect(text).toContain("No se pudo incorporar");
  });
});

async function extractEmbeddedPdfTextForTest(bytes: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 });
  try { const pdf = await task.promise; const text: string[] = []; for (let i = 1; i <= pdf.numPages; i++) { const page = await pdf.getPage(i); text.push((await page.getTextContent()).items.map(item => "str" in item ? item.str : "").join(" ")); page.cleanup(); } return text.join("\n"); }
  finally { await task.destroy(); }
}
