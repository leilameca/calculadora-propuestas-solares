import type { PdfContext } from "../types";
import { CONTENT_W, drawLine, drawRect, drawText, MARGIN, pageFooter, sectionPage, wrap } from "../components/primitives";

export function renderPage(ctx: PdfContext) {
  const page = sectionPage(ctx, "08", "Proceso", "Una ruta clara desde la aprobación hasta la puesta en marcha.");
  const phases = [
    ["Aprobación", "Evaluación y aprobación por parte de la distribuidora eléctrica."],
    ["Instalación", "Montaje de paneles, inversor, estructura y cableado en sitio."],
    ["Supervisión", "Inspección técnica oficial de la instalación."],
    ["Interconexión", "Firma de documentos de conexión a la red eléctrica."],
    ["Medición", "Gestión e instalación del medidor bidireccional."],
    ["Activación", "Puesta en marcha y verificación del sistema fotovoltaico."],
  ];
  const y = 520;
  const step = CONTENT_W / (phases.length - 1);
  drawLine(page, MARGIN, y, MARGIN + CONTENT_W, y, ctx.light, 4);
  phases.forEach(([title], index) => {
    const x = MARGIN + index * step;
    page.drawCircle({ x, y, size: 9, color: index === phases.length - 1 ? ctx.accent : ctx.primary });
    drawText(page, String(index + 1).padStart(2, "0"), x, y + 28, ctx.helveticaBold, 11, ctx.accent, { align: "center", width: 42 });
    drawText(page, title.toUpperCase(), x, y - 32, ctx.helveticaBold, 6.5, ctx.muted, { align: "center", width: 72 });
  });
  const detailY = 410;
  phases.forEach(([title, description], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const boxW = (CONTENT_W - 12) / 2;
    const x = MARGIN + column * (boxW + 12);
    const boxY = detailY - row * 86;
    drawRect(page, x, boxY - 65, boxW, 65, index % 2 ? ctx.white : ctx.light);
    drawText(page, `${String(index + 1).padStart(2, "0")}  ${title}`, x + 12, boxY - 20, ctx.helveticaBold, 9.5, ctx.ink, { width: boxW - 24 });
    wrap(description, ctx.helvetica, 7.5, boxW - 24).slice(0, 2).forEach((line, lineIndex) => drawText(page, line, x + 12, boxY - 37 - lineIndex * 11, ctx.helvetica, 7.5, ctx.muted));
  });
  pageFooter(ctx, page);
}
