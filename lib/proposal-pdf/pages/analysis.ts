import { consumptionChart } from "../components/chart";
import { MONTHS } from "../../solar-calculator";
import type { PdfContext } from "../types";
import { CONTENT_W, drawRect, drawText, formatNum, MARGIN, metricCard, pageFooter, sectionPage } from "../components/primitives";

export function renderPage(ctx: PdfContext) {
  const { input, helvetica, helveticaBold, primary, secondary, accent, ink, muted, light, white } = ctx;
  const page = sectionPage(ctx, "04", "Consumo y generación", "Los consumos facturados se muestran sin completar ni sustituir meses faltantes.");
  const realPeriods = input.consumption.filter(value => value > 0).length;
  const cardW = (CONTENT_W - 20) / 3;
  metricCard(ctx, page, MARGIN, 575, cardW, `${input.result.averageMonthlyConsumption.toFixed(2)} kWh`, "Promedio de referencia", primary);
  metricCard(ctx, page, MARGIN + cardW + 10, 575, cardW, `${realPeriods}`, "Períodos con consumo real", secondary);
  metricCard(ctx, page, MARGIN + 2 * (cardW + 10), 575, cardW, `${formatNum(input.result.annualGeneration)} kWh`, "Generación anual", accent, false);

  let y = 540;
  const widths = [CONTENT_W * .28, CONTENT_W * .36, CONTENT_W * .36];
  drawRect(page, MARGIN, y - 20, CONTENT_W, 22, primary);
  ["MES", "CONSUMO REAL", "GENERACIÓN PROYECTADA"].forEach((label, index) => {
    const x = MARGIN + widths.slice(0, index).reduce((sum, value) => sum + value, 0);
    drawText(page, label, x + 7, y - 14, helveticaBold, 7.5, white, { width: widths[index] - 14 });
  });
  y -= 22;
  MONTHS.forEach((month, index) => {
    drawRect(page, MARGIN, y - 17, CONTENT_W, 17, index % 2 ? white : light);
    const consumption = input.consumption[index];
    const values = [month, consumption > 0 ? `${formatNum(consumption)} kWh` : "", `${formatNum(input.result.monthlyGeneration[index])} kWh`];
    values.forEach((value, column) => {
      const x = MARGIN + widths.slice(0, column).reduce((sum, width) => sum + width, 0);
      if (value) drawText(page, value, x + 7, y - 12, column === 1 ? helveticaBold : helvetica, 8, column === 1 ? primary : ink, { width: widths[column] - 14 });
    });
    y -= 17;
  });
  drawText(page, "Los espacios vacíos indican meses sin consumo facturado disponible.", MARGIN, y - 13, helvetica, 7.5, muted);
  consumptionChart(ctx, page, 92);
  pageFooter(ctx, page);
}
