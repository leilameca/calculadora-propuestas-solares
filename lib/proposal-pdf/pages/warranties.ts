import type { PdfContext } from "../types";
import { CONTENT_W, drawRect, drawText, MARGIN, pageFooter, sectionPage } from "../components/primitives";

const LABELS: Record<string, string> = { PANEL: "Panel", INVERTER: "Inversor", BATTERY: "Batería" };

export function renderPage(ctx: PdfContext) {
  const page = sectionPage(ctx, "07", "Garantías", "Respaldo informado directamente desde los equipos seleccionados.");
  const items = (ctx.input.selectedEquipment ?? []).filter(item => item.warrantyYears && item.warrantyYears > 0);
  const gap = 10;
  const cardW = (CONTENT_W - gap * (items.length - 1)) / items.length;
  items.forEach((item, index) => {
    const x = MARGIN + index * (cardW + gap);
    drawRect(page, x, 560, cardW, 82, ctx.light);
    drawText(page, `${item.warrantyYears} años`, x + 14, 603, ctx.helveticaBold, 18, index === items.length - 1 ? ctx.accent : ctx.ink, { width: cardW - 28 });
    drawText(page, (LABELS[item.type] || item.type).toUpperCase(), x + 14, 580, ctx.helveticaBold, 7.5, ctx.muted, { width: cardW - 28 });
  });

  drawText(page, "COBERTURA POR EQUIPO", MARGIN, 515, ctx.helveticaBold, 8, ctx.accent);
  let y = 475;
  items.forEach((item, index) => {
    drawRect(page, MARGIN, y - 58, CONTENT_W, 58, index % 2 ? ctx.white : ctx.light);
    drawText(page, item.name, MARGIN + 16, y - 23, ctx.helveticaBold, 11, ctx.ink, { width: CONTENT_W * .65 });
    drawText(page, `${item.warrantyYears} años`, PAGE_W_FROM_MARGIN, y - 23, ctx.helveticaBold, 11, ctx.secondary, { align: "right", width: CONTENT_W * .25 });
    y -= 70;
  });
  drawText(page, "Las condiciones específicas se rigen por la documentación vigente de cada fabricante.", MARGIN, y - 10, ctx.helvetica, 8.5, ctx.muted, { width: CONTENT_W });
  pageFooter(ctx, page);
}

const PAGE_W_FROM_MARGIN = MARGIN + CONTENT_W - 16;
