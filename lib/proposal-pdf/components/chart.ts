import type { PdfContext } from "../types";
import type { PDFPage } from "pdf-lib";
import { drawRect, drawText, CONTENT_W, MARGIN } from "./primitives";
import { MONTHS } from "../../solar-calculator";

export function consumptionChart(ctx: PdfContext, page: PDFPage, y: number) {
  const max = Math.max(1, ...ctx.input.consumption, ...ctx.input.result.monthlyGeneration);
  const step = CONTENT_W / 12, height = 105;
  drawText(page, "GENERACIÓN Y CONSUMO MENSUAL (kWh)", MARGIN, y + height + 35, ctx.helveticaBold, 9, ctx.primary);
  for (let i = 0; i < 12; i++) {
    const x = MARGIN + step * i;
    drawRect(page, x + 3, y, 12, height * ctx.input.consumption[i] / max, ctx.primary);
    drawRect(page, x + 17, y, 12, height * ctx.input.result.monthlyGeneration[i] / max, ctx.accent);
    drawText(page, MONTHS[i].slice(0, 3), x + 3, y - 13, ctx.helvetica, 7, ctx.muted, { width: step - 4 });
  }
  drawText(page, "Consumo: color primario | Generación: color de acento", MARGIN, y - 30, ctx.helvetica, 8, ctx.muted);
}
