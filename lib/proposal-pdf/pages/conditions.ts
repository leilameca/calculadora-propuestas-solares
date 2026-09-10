import type { PdfContext } from "../types";
import { CONTENT_W, drawLine, drawRect, drawText, formatDop, formatUsd, MARGIN, metricCard, pageFooter, sectionPage } from "../components/primitives";

export function renderPage(ctx: PdfContext) {
  const { input, helvetica, helveticaBold, primary, secondary, accent, ink, muted, light, white } = ctx;
  const page = sectionPage(ctx, "05", "Ahorro y retorno", "Proyección financiera basada en la generación y tarifa configuradas en HelioPro.");
  const metrics: Array<[string, string, typeof primary, boolean?]> = [
    [formatDop(input.result.annualSavingsDop), "Ahorro anual estimado", primary],
    ...(Number.isFinite(input.result.roiYears) ? [[`${input.result.roiYears.toFixed(1)} años`, "Retorno estimado", secondary] as [string, string, typeof primary]] : []),
    [formatUsd(ctx.quoteTotal), "Inversión total", accent, false],
  ];
  const gap = 10;
  const cardW = (CONTENT_W - gap * (metrics.length - 1)) / metrics.length;
  metrics.forEach(([value, label, color, lightText], index) => metricCard(ctx, page, MARGIN + index * (cardW + gap), 575, cardW, value, label, color, lightText !== false));

  drawText(page, "PROYECCIÓN A 25 AÑOS", MARGIN, 530, helveticaBold, 9, secondary);
  const rows = input.result.projection25Years.filter(row => [1, 5, 10, 15, 20, 25].includes(row.year));
  let y = 500;
  const widths = [CONTENT_W * .16, CONTENT_W * .28, CONTENT_W * .26, CONTENT_W * .30];
  drawRect(page, MARGIN, y, CONTENT_W, 24, primary);
  ["AÑO", "GENERACIÓN", "AHORRO", "AHORRO ACUMULADO"].forEach((label, index) => {
    const x = MARGIN + widths.slice(0, index).reduce((sum, width) => sum + width, 0);
    drawText(page, label, x + 8, y + 8, helveticaBold, 7.5, white, { width: widths[index] - 16 });
  });
  y -= 2;
  rows.forEach((row, index) => {
    y -= 38;
    drawRect(page, MARGIN, y, CONTENT_W, 36, index % 2 ? white : light);
    const values = [String(row.year), `${Math.round(row.generationKwh).toLocaleString("es-DO")} kWh`, formatDop(row.savingsDop), formatDop(row.accumulatedSavingsDop)];
    values.forEach((value, column) => {
      const x = MARGIN + widths.slice(0, column).reduce((sum, width) => sum + width, 0);
      drawText(page, value, x + 8, y + 13, column === 3 ? helveticaBold : helvetica, 8.5, column === 3 ? secondary : ink, { width: widths[column] - 16 });
    });
  });

  const chartY = 118;
  const chartH = 105;
  const values = input.result.projection25Years.map(row => row.accumulatedSavingsDop);
  const max = Math.max(1, ...values);
  const step = CONTENT_W / Math.max(1, values.length - 1);
  drawText(page, "CRECIMIENTO DEL AHORRO ACUMULADO", MARGIN, chartY + chartH + 30, helveticaBold, 8, primary);
  values.forEach((value, index) => {
    if (!index) return;
    const previous = values[index - 1];
    drawLine(page, MARGIN + (index - 1) * step, chartY + chartH * previous / max, MARGIN + index * step, chartY + chartH * value / max, accent, 2);
  });
  drawLine(page, MARGIN, chartY, MARGIN + CONTENT_W, chartY, muted, .5);
  drawText(page, "1", MARGIN, chartY - 14, helvetica, 7, muted);
  drawText(page, "25 años", MARGIN + CONTENT_W, chartY - 14, helvetica, 7, muted, { align: "right" });
  pageFooter(ctx, page);
}
