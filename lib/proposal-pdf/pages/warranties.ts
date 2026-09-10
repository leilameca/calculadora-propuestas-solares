import type { PdfContext } from "../types";
import { drawText, drawRect, drawLine, PAGE_W, PAGE_H, MARGIN, CONTENT_W } from "../components/primitives";

export function renderPage(ctx: PdfContext) {
  const { pdf, input, helvetica, helveticaBold, primary, secondary, accent, ink, muted, light, white } = ctx;
  const page6 = pdf.addPage([PAGE_W, PAGE_H]);
  drawRect(page6, 0, PAGE_H - 60, PAGE_W, 60, primary);
  drawText(page6, "PROPUESTA ENERGÉTICA", MARGIN, PAGE_H - 30, helveticaBold, 16, white);
  drawText(page6, "05", PAGE_W - MARGIN, PAGE_H - 30, helveticaBold, 16, accent, { align: "right" });

  let y = PAGE_H - 100;
  drawText(page6, "Garantías del Sistema", MARGIN, y, helveticaBold, 18, primary);
  y -= 20;
  drawText(page6, "Respaldo total en equipos y servicio", MARGIN, y, helvetica, 12, muted);
  y -= 40;

  const warranties = [
    ["Panel Solar Fotovoltaico", "GARANTÍA DEL PRODUCTO", "10 años", "GARANTÍA DE RENDIMIENTO", "30 años", primary],
    ["Inversor de Red", "GARANTÍA DEL PRODUCTO", "5 años", "GARANTÍA DE RENDIMIENTO", "10 años", secondary],
    ["Soporte Técnico", "SOPORTE INCLUIDO", "2 años", "ASISTENCIA", "24/7", accent],
  ] as const;

  for (const [title, label1, value1, label2, value2, color] of warranties) {
    drawRect(page6, MARGIN, y - 80, CONTENT_W, 80, light);
    drawRect(page6, MARGIN, y - 80, 6, 80, color);
    drawText(page6, title, MARGIN + 20, y - 20, helveticaBold, 14, ink);
    drawText(page6, label1, MARGIN + 20, y - 40, helvetica, 9, muted);
    drawText(page6, value1, MARGIN + 20, y - 56, helveticaBold, 12, color);
    drawText(page6, label2, MARGIN + 200, y - 40, helvetica, 9, muted);
    drawText(page6, value2, MARGIN + 200, y - 56, helveticaBold, 12, color);
    y -= 100;
  }

  y -= 20;
  drawRect(page6, MARGIN, y - 40, CONTENT_W, 40, primary);
  drawText(page6, `${input.company.name.toUpperCase()}  ·  25+ AÑOS DE VIDA ÚTIL  ·  0 EMISIÓN DE CO₂  ·  SOPORTE TÉCNICO 24/7`, PAGE_W / 2, y - 14, helveticaBold, 9, white, { align: "center" });

  drawLine(page6, MARGIN, 40, PAGE_W - MARGIN, 40, primary, 2);
  drawText(page6, `${input.company.name.toUpperCase()}  ·  ENERGÍA SOLAR`, PAGE_W - MARGIN, 28, helveticaBold, 8, primary, { align: "right" });

}
