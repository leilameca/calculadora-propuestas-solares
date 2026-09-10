import { consumptionChart } from "../components/chart";
import { MONTHS } from "../../solar-calculator";
import type { PdfContext } from "../types";
import { drawText, drawRect, drawLine, formatDop, formatNum, PAGE_W, PAGE_H, MARGIN, CONTENT_W } from "../components/primitives";

export function renderPage(ctx: PdfContext) {
  const { pdf, input, helvetica, helveticaBold, helveticaOblique, primary, secondary, accent, ink, muted, light, white } = ctx;
  const page4 = pdf.addPage([PAGE_W, PAGE_H]);
  drawRect(page4, 0, PAGE_H - 60, PAGE_W, 60, primary);
  drawText(page4, "PROPUESTA ENERGÉTICA", MARGIN, PAGE_H - 30, helveticaBold, 16, white);
  drawText(page4, "03", PAGE_W - MARGIN, PAGE_H - 30, helveticaBold, 16, accent, { align: "right" });

  let y = PAGE_H - 100;
  drawText(page4, "Análisis de Consumo y Producción Solar", MARGIN, y, helveticaBold, 18, primary);
  y -= 30;

  const metricW = (CONTENT_W - 20) / 3;
  drawRect(page4, MARGIN, y - 50, metricW, 50, primary);
  drawText(page4, formatDop(input.result.annualSavingsDop), MARGIN + 10, y - 14, helveticaBold, 14, white,{width:metricW-20});
  drawText(page4, "AHORRO ANUAL ESTIMADO", MARGIN + 10, y - 30, helvetica, 8, white);

  drawRect(page4, MARGIN + metricW + 10, y - 50, metricW, 50, secondary);
  drawText(page4, `${formatNum(input.result.annualGeneration)} kWh`, MARGIN + metricW + 20, y - 14, helveticaBold, 14, white,{width:metricW-20});
  drawText(page4, "GENERACIÓN ANUAL", MARGIN + metricW + 20, y - 30, helvetica, 8, white);

  drawRect(page4, MARGIN + 2 * (metricW + 10), y - 50, metricW, 50, accent);
  drawText(page4, `~${input.result.co2AvoidedTons.toFixed(1)} Ton`, MARGIN + 2 * (metricW + 10) + 10, y - 14, helveticaBold, 14, ink,{width:metricW-20});
  drawText(page4, "CO₂ EVITADO / AÑO", MARGIN + 2 * (metricW + 10) + 10, y - 30, helvetica, 8, ink);

  y -= 80;

  const tableW = CONTENT_W;
  const colWidths = [tableW * 0.25, tableW * 0.25, tableW * 0.25, tableW * 0.25];
  const rowH = 20;
  const headerRowY = y;
  drawRect(page4, MARGIN, headerRowY - rowH, tableW, rowH, primary);
  const headers = ["MES", "CONSUMO kWh", "GENERACIÓN kWh", "COBERTURA"];
  let cx = MARGIN;
  headers.forEach((h, i) => {
    drawText(page4, h, cx + 8, headerRowY - 14, helveticaBold, 9, white);
    cx += colWidths[i];
  });
  y -= rowH + 2;

  MONTHS.forEach((month, index) => {
    const rowY = y;
    drawRect(page4, MARGIN, rowY - rowH, tableW, rowH, index % 2 ? light : white);
    const cells = [
      month,
      formatNum(input.consumption[index]),
      formatNum(input.result.monthlyGeneration[index]),
      `${input.result.monthlyCoverage[index].toFixed(1)}%`,
    ];
    cx = MARGIN;
    cells.forEach((cell, i) => {
      drawText(page4, cell, cx + 8, rowY - 14, i === 3 ? helveticaBold : helvetica, 9, i === 3 && input.result.monthlyCoverage[index] >= 100 ? secondary : ink,{width:colWidths[i]-16});
      cx += colWidths[i];
    });
    y -= rowH;
  });

  y -= 20;
  drawText(page4, "Datos calculados a partir del consumo declarado por el cliente.", MARGIN, y, helveticaOblique, 8, muted);
  y -= 16;
  drawText(page4, "Importante. La generación estimada dependerá de las condiciones climatológicas del sitio. El ahorro proyectado tiene un margen de +/-5%.", MARGIN, y, helveticaOblique, 8, muted);

  consumptionChart(ctx,page4,125);
  drawLine(page4, MARGIN, 40, PAGE_W - MARGIN, 40, primary, 2);
  drawText(page4, `${input.company.name.toUpperCase()}  ·  ENERGÍA SOLAR`, PAGE_W - MARGIN, 28, helveticaBold, 8, primary, { align: "right" });

}
