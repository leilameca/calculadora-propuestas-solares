import type { PdfContext } from "../types";
import { CONTENT_W, drawRect, drawText, formatDop, formatNum, MARGIN, metricCard, pageFooter, sectionPage, wrap } from "../components/primitives";

export function renderPage(ctx: PdfContext) {
  const { input, helvetica, helveticaBold, primary, secondary, accent, ink, muted, light } = ctx;
  const page = sectionPage(ctx, "02", "Resumen ejecutivo", "Una visión clara de la solución propuesta y su impacto estimado.");
  const gap = 12;
  const cardW = (CONTENT_W - gap) / 2;
  metricCard(ctx, page, MARGIN, 560, cardW, `${input.result.installedKwp.toFixed(2)} kWp`, "Potencia instalada", primary);
  metricCard(ctx, page, MARGIN + cardW + gap, 560, cardW, `${input.result.panelCount}`, "Paneles solares", secondary);
  metricCard(ctx, page, MARGIN, 476, cardW, `${formatNum(input.result.annualGeneration)} kWh`, "Generación anual", accent, false);
  metricCard(ctx, page, MARGIN + cardW + gap, 476, cardW, formatDop(input.result.annualSavingsDop), "Ahorro anual estimado", primary);

  drawText(page, "EL PROYECTO", MARGIN, 426, helveticaBold, 9, secondary);
  const defaultDescription = `Sistema solar fotovoltaico ${input.project.systemType} diseñado para ${input.customer.name} en ${input.customer.address || input.project.city}. La solución prioriza el consumo energético declarado y la generación proyectada para el sitio.`;
  const description = input.proposalText || defaultDescription;
  let y = 400;
  for (const line of wrap(description, helvetica, 11, CONTENT_W).slice(0, 7)) {
    drawText(page, line, MARGIN, y, helvetica, 11, ink);
    y -= 17;
  }

  y -= 15;
  drawRect(page, MARGIN, y - 116, CONTENT_W, 116, light);
  const details = [
    ["Cliente", `${input.customer.name}${input.customer.nic ? ` · NIC ${input.customer.nic}` : ""}`],
    ["Ubicación", input.customer.address || input.project.city],
    ["Modalidad", input.project.systemType],
    ["Distribuidora / tarifa", [input.project.utility, input.project.tariff].filter(Boolean).join(" · ")],
    ["Fecha", ctx.date],
    ["Vigencia", input.company.proposalValidityDays ? `${input.company.proposalValidityDays} días` : ""],
  ].filter((entry) => entry[1]);
  details.forEach(([label, value], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + 16 + col * (CONTENT_W / 2);
    const lineY = y - 24 - row * 34;
    drawText(page, label.toUpperCase(), x, lineY, helveticaBold, 7, muted, { width: CONTENT_W / 2 - 30 });
    drawText(page, value, x, lineY - 13, helveticaBold, 9.5, ink, { width: CONTENT_W / 2 - 30 });
  });
  pageFooter(ctx, page);
}
