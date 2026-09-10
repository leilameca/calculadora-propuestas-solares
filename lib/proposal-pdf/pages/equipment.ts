import type { PdfContext } from "../types";
import { CONTENT_W, drawImageContain, drawRect, drawText, MARGIN, pageFooter, sectionPage, wrap } from "../components/primitives";

const LABELS: Record<string, string> = { PANEL: "Panel solar", INVERTER: "Inversor", BATTERY: "Batería" };

export function renderPage(ctx: PdfContext) {
  const page = sectionPage(ctx, "06", "Equipos", "Componentes seleccionados desde el inventario de la empresa.");
  const items = ctx.input.selectedEquipment ?? [];
  const columns = items.length === 1 ? 1 : 2;
  const gap = 14;
  const cardW = columns === 1 ? CONTENT_W : (CONTENT_W - gap) / 2;
  const cardH = items.length > 2 ? 220 : 280;

  items.forEach((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const wideLastCard = items.length > 1 && items.length % 2 === 1 && index === items.length - 1;
    const currentCardW = wideLastCard ? CONTENT_W : cardW;
    const x = wideLastCard ? MARGIN : MARGIN + column * (cardW + gap);
    const y = 640 - row * (cardH + gap) - cardH;
    drawRect(page, x, y, currentCardW, cardH, ctx.light);
    drawRect(page, x, y + cardH - 8, currentCardW, 8, index % 2 ? ctx.secondary : ctx.primary);
    const logo = ctx.equipmentLogos.get(item.name);
    if (logo) drawImageContain(page, logo, x + 18, y + cardH - 78, currentCardW - 36, 46);
    else drawText(page, item.brand || item.name, x + 18, y + cardH - 55, ctx.helveticaBold, 14, ctx.primary, { width: currentCardW - 36 });
    drawText(page, (LABELS[item.type] || item.type).toUpperCase(), x + 18, y + cardH - 100, ctx.helveticaBold, 7.5, ctx.muted, { width: currentCardW - 36 });
    drawText(page, item.brand || "", x + 18, y + cardH - 122, ctx.helveticaBold, 13, ctx.ink, { width: currentCardW - 36 });
    drawText(page, item.model || item.name, x + 18, y + cardH - 142, ctx.helvetica, 10, ctx.ink, { width: currentCardW - 36 });
    const specifications = [
      item.type === "PANEL" && item.powerWatts ? `${item.powerWatts} W por panel` : "",
      item.type === "PANEL" && item.quantity ? `${item.quantity} unidades` : "",
      item.type !== "PANEL" && item.powerWatts ? `${item.powerWatts} W` : "",
      item.capacityKwh ? `${item.capacityKwh.toFixed(2)} kWh de capacidad` : "",
      item.warrantyYears ? `${item.warrantyYears} años de garantía` : "",
    ].filter(Boolean);
    let textY = y + cardH - 170;
    specifications.forEach(specification => {
      drawText(page, specification, x + 18, textY, ctx.helveticaBold, 8.5, ctx.secondary, { width: cardW - 36 });
      textY -= 15;
    });
    if (item.description) wrap(item.description, ctx.helvetica, 8, currentCardW - 36).slice(0, 3).forEach(line => {
      drawText(page, line, x + 18, textY, ctx.helvetica, 8, ctx.muted, { width: currentCardW - 36 });
      textY -= 12;
    });
  });
  pageFooter(ctx, page);
}
