import { PDFDocument } from "pdf-lib";
import type { PdfContext } from "../types";
import { CONTENT_W, drawImageContain, drawRect, drawText, MARGIN, PAGE_H, PAGE_W } from "../components/primitives";
import { decodeDataUrl } from "../../storage/validation";
import { safeImage } from "../../proposal-assets";

interface AnnexEntry { name: string; mimeType: string; dataUrl: string; heading: string; code: "A" | "B" | "C" }

function annexPage(ctx: PdfContext, entry: AnnexEntry, pageIndex: number, pageCount: number) {
  const page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  drawText(page, `${entry.code} / ${entry.heading.toUpperCase()}`, MARGIN, PAGE_H - 38, ctx.helveticaBold, 8, ctx.accent, { width: CONTENT_W });
  drawText(page, entry.heading, MARGIN, PAGE_H - 76, ctx.helveticaBold, 23, ctx.ink, { width: CONTENT_W });
  drawText(page, `${entry.name}${pageCount > 1 ? ` · página ${pageIndex + 1} de ${pageCount}` : ""}`, MARGIN, PAGE_H - 96, ctx.helvetica, 8, ctx.muted, { width: CONTENT_W });
  drawRect(page, MARGIN, MARGIN + 18, CONTENT_W, PAGE_H - 172, ctx.light);
  return page;
}

export async function appendAttachments(ctx: PdfContext) {
  const attachments = ctx.input.attachments ?? [];
  const entries: AnnexEntry[] = [
    ...(ctx.input.invoice ? [{ ...ctx.input.invoice, heading: "Factura eléctrica", code: "A" as const }] : []),
    ...attachments.filter(item => item.kind === "DATASHEET").map(item => ({ name: item.fileName, mimeType: item.mimeType, dataUrl: item.dataUrl, heading: `Datasheet · ${item.equipmentName}`, code: "B" as const })),
    ...attachments.filter(item => item.kind === "CERTIFICATE").map(item => ({ name: item.fileName, mimeType: item.mimeType, dataUrl: item.dataUrl, heading: `Certificado · ${item.equipmentName}`, code: "C" as const })),
  ];
  let totalPages = 0;
  for (const entry of entries) {
    try {
      const { bytes, mimeType } = decodeDataUrl(entry.dataUrl);
      if (mimeType === "application/pdf") {
        const source = await PDFDocument.load(bytes);
        const count = source.getPageCount();
        if (count > 20 || totalPages + count > 80) throw new Error("Límite de anexos excedido.");
        const embeddedPages = await ctx.pdf.embedPdf(bytes, source.getPageIndices());
        embeddedPages.forEach((embedded, index) => {
          const page = annexPage(ctx, entry, index, count);
          const scale = Math.min((CONTENT_W - 20) / embedded.width, (PAGE_H - 192) / embedded.height);
          const size = { width: embedded.width * scale, height: embedded.height * scale };
          page.drawPage(embedded, { x: (PAGE_W - size.width) / 2, y: MARGIN + 28 + (PAGE_H - 192 - size.height) / 2, ...size });
        });
        totalPages += count;
      } else {
        const imageData = await safeImage(entry.dataUrl);
        if (!imageData) throw new Error("Imagen inválida.");
        const embedded = await ctx.pdf.embedPng(Buffer.from(imageData.split(",")[1], "base64"));
        const page = annexPage(ctx, entry, 0, 1);
        drawImageContain(page, embedded, MARGIN + 10, MARGIN + 28, CONTENT_W - 20, PAGE_H - 192);
        totalPages += 1;
      }
    } catch (error) {
      console.warn("pdf.attachment_unavailable", { name: entry.name, type: error instanceof Error ? error.name : "unknown" });
    }
  }
}
