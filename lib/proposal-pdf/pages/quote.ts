import type { PdfContext } from "../types";
import { PdfFlow } from "../components/flow";
import { CONTENT_W, drawImageContain, drawRect, drawText, formatDop, formatNum, formatUsd, MARGIN } from "../components/primitives";

const TYPE_LABELS: Record<string, string> = { PANEL: "Panel solar", INVERTER: "Inversor", BATTERY: "Batería" };

export function renderPage(ctx: PdfContext) {
  const { input } = ctx;
  const flow = new PdfFlow(ctx, "Solución e inversión", "03");
  flow.paragraph(`Sistema ${input.project.systemType} de ${input.result.installedKwp.toFixed(2)} kWp, con una generación anual proyectada de ${formatNum(input.result.annualGeneration)} kWh.`, true, 11);

  const equipment = input.selectedEquipment ?? [];
  if (equipment.length) {
    flow.paragraph("EQUIPOS PRINCIPALES", true, 9);
    const cardGap = 10;
    const cardW = (CONTENT_W - cardGap * (Math.min(3, equipment.length) - 1)) / Math.min(3, equipment.length);
    equipment.slice(0, 3).forEach((item, index) => {
      const x = MARGIN + index * (cardW + cardGap);
      const y = flow.y - 88;
      drawRect(flow.page, x, y, cardW, 88, ctx.light);
      const logo = ctx.equipmentLogos.get(item.name);
      if (logo) drawImageContain(flow.page, logo, x + 10, y + 50, cardW - 20, 28);
      else drawText(flow.page, item.brand || item.name, x + 10, y + 62, ctx.helveticaBold, 9, ctx.primary, { width: cardW - 20 });
      drawText(flow.page, TYPE_LABELS[item.type] || item.type, x + 10, y + 37, ctx.helveticaBold, 7, ctx.muted, { width: cardW - 20 });
      drawText(flow.page, item.model || item.name, x + 10, y + 22, ctx.helveticaBold, 9, ctx.ink, { width: cardW - 20 });
      const detail = item.type === "PANEL" && item.powerWatts ? `${item.quantity || input.result.panelCount} × ${item.powerWatts} W` : item.type === "BATTERY" && item.capacityKwh ? `${item.capacityKwh} kWh` : item.powerWatts ? `${item.powerWatts} W` : "";
      if (detail) drawText(flow.page, detail, x + 10, y + 8, ctx.helvetica, 8, ctx.secondary, { width: cardW - 20 });
    });
    flow.y -= 110;
  }

  flow.paragraph("INVERSIÓN", true, 9);
  flow.table(["CONCEPTO", "DESCRIPCIÓN", "MONTO USD"], input.quoteItems.map(item => [item.name, item.description || "Incluido", formatUsd(item.amountUsd)]), [CONTENT_W * .26, CONTENT_W * .44, CONTENT_W * .30]);
  flow.table(["RESUMEN COMERCIAL", "MONTO"], [
    ["Subtotal", formatUsd(ctx.quoteSubtotal)],
    ...(ctx.quoteTax > 0 ? [["ITBIS", formatUsd(ctx.quoteTax)]] : []),
    ["Inversión total", formatUsd(ctx.quoteTotal)],
    ...(ctx.quoteTotalDop > 0 ? [["Equivalente", formatDop(ctx.quoteTotalDop)]] : []),
    ...(ctx.quotePricePerWp > 0 ? [["Precio por Wp", `${formatUsd(ctx.quotePricePerWp)}/Wp`]] : []),
  ], [CONTENT_W * .65, CONTENT_W * .35]);
}
