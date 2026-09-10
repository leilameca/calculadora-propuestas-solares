import type { PdfContext } from "../types";
import type { PDFPage } from "pdf-lib";
import { drawLine, drawRect, drawText, CONTENT_W, MARGIN } from "./primitives";
import { MONTHS } from "../../solar-calculator";

export function consumptionChart(ctx: PdfContext, page: PDFPage, y: number) {
  const average = ctx.input.result.averageMonthlyConsumption;
  const max = Math.max(1, average, ...ctx.input.consumption, ...ctx.input.result.monthlyGeneration);
  const step = CONTENT_W / 12;
  const height = 132;
  drawText(page, "CONSUMO REAL VS. GENERACIÓN PROYECTADA", MARGIN, y + height + 42, ctx.helveticaBold, 9, ctx.primary);
  drawLine(page, MARGIN, y, MARGIN + CONTENT_W, y, ctx.muted, .6);
  for (let i = 0; i < 12; i++) {
    const x = MARGIN + step * i;
    const consumption = ctx.input.consumption[i];
    if (consumption > 0) drawRect(page, x + 4, y, 12, height * consumption / max, ctx.primary);
    drawRect(page, x + 19, y, 12, height * ctx.input.result.monthlyGeneration[i] / max, ctx.accent);
    drawText(page, MONTHS[i].slice(0, 3), x + step / 2, y - 14, ctx.helvetica, 7, ctx.muted, { align: "center", width: step - 2 });
  }
  if (average > 0) {
    const averageY = y + height * average / max;
    page.drawLine({ start: { x: MARGIN, y: averageY }, end: { x: MARGIN + CONTENT_W, y: averageY }, color: ctx.secondary, thickness: 1.5, dashArray: [5, 3] });
  }
  const legendY = y - 35;
  drawRect(page, MARGIN, legendY, 9, 9, ctx.primary);
  drawText(page, "Consumo real disponible", MARGIN + 14, legendY + 1, ctx.helvetica, 7.5, ctx.ink);
  drawRect(page, MARGIN + 142, legendY, 9, 9, ctx.accent);
  drawText(page, "Generación proyectada", MARGIN + 156, legendY + 1, ctx.helvetica, 7.5, ctx.ink);
  page.drawLine({ start: { x: MARGIN + 294, y: legendY + 4 }, end: { x: MARGIN + 316, y: legendY + 4 }, color: ctx.secondary, thickness: 1.5, dashArray: [4, 2] });
  drawText(page, "Promedio de referencia", MARGIN + 322, legendY + 1, ctx.helvetica, 7.5, ctx.ink);
}
