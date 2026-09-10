import { PDFDocument, PDFName, PDFBool } from "pdf-lib";
import type { PdfContext } from "../types";
import { PdfFlow } from "../components/flow";
import { CONTENT_W, MARGIN, PAGE_H, PAGE_W } from "../components/primitives";
import { decodeDataUrl } from "../../storage/validation";
import { safeImage } from "../../proposal-assets";

export async function appendAttachments(ctx: PdfContext) {
  const entries = [
    ...(ctx.input.invoice ? [{ ...ctx.input.invoice, heading: "Factura del cliente" }] : []),
    ...(ctx.input.attachments ?? []).map(item => ({ name: item.fileName, mimeType: item.mimeType, dataUrl: item.dataUrl, heading: `${item.kind === "DATASHEET" ? "Datasheet" : "Certificado"} - ${item.equipmentName}` })),
  ];
  let totalPages = 0;
  for (const entry of entries) {
    const flow = new PdfFlow(ctx, entry.heading);
    flow.paragraph(entry.name);
    try {
      const { bytes, mimeType } = decodeDataUrl(entry.dataUrl);
      if (mimeType === "application/pdf") {
        const source = await PDFDocument.load(bytes);
        if (source.getPageCount() > 20 || totalPages + source.getPageCount() > 80) throw new Error("Límite de anexos excedido.");
        const pages = await ctx.pdf.copyPages(source, source.getPageIndices());
        for (const page of pages) { page.node.set(PDFName.of("HelioProAnnex"), PDFBool.True); ctx.pdf.addPage(page); }
        totalPages += pages.length;
      } else {
        const image = await safeImage(entry.dataUrl);
        if (!image) throw new Error("Imagen inválida.");
        const embedded = await ctx.pdf.embedPng(Buffer.from(image.split(",")[1], "base64"));
        const size = embedded.scaleToFit(CONTENT_W, PAGE_H - 210);
        flow.page.drawImage(embedded, { x: (PAGE_W - size.width) / 2, y: Math.max(MARGIN + 20, flow.y - size.height), ...size });
      }
    } catch {
      console.warn("pdf.attachment_unavailable", { mimeType: entry.mimeType });
      flow.paragraph("No se pudo incorporar este adjunto. Solicite una copia válida del documento.");
    }
  }
  if (ctx.input.selectedEquipment?.length) {
    const flow = new PdfFlow(ctx, "Equipos seleccionados");
    for (const item of ctx.input.selectedEquipment) {
      flow.ensure(100);
      flow.paragraph(item.name, true);
      flow.paragraph(item.warrantyYears ? `Garantía del fabricante: ${item.warrantyYears} años.` : "Garantía según fabricante.");
      const image = await safeImage(item.logoUrl ?? undefined);
      if (image) {
        const embedded = await ctx.pdf.embedPng(Buffer.from(image.split(",")[1], "base64"));
        const size = embedded.scaleToFit(100, 40);
        flow.page.drawImage(embedded, { x: MARGIN, y: flow.y - size.height, ...size }); flow.y -= 50;
      }
    }
  }
}
