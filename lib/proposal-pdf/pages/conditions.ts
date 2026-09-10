import type { PdfContext } from "../types";
import { drawText, drawRect, drawLine, PAGE_W, PAGE_H, MARGIN, CONTENT_W } from "../components/primitives";

export function renderPage(ctx: PdfContext) {
  const { pdf, input, helvetica, helveticaBold, primary, secondary, accent, ink, muted, light, white } = ctx;
  const page5 = pdf.addPage([PAGE_W, PAGE_H]);
  drawRect(page5, 0, PAGE_H - 60, PAGE_W, 60, primary);
  drawText(page5, "PROPUESTA ENERGÉTICA", MARGIN, PAGE_H - 30, helveticaBold, 16, white);
  drawText(page5, "04", PAGE_W - MARGIN, PAGE_H - 30, helveticaBold, 16, accent, { align: "right" });

  let y = PAGE_H - 100;
  drawText(page5, "Marco Legal y Beneficios", MARGIN, y, helveticaBold, 18, primary);
  y -= 20;
  drawText(page5, "Ley 57-07", MARGIN, y, helveticaBold, 14, secondary);
  y -= 30;

  drawText(page5, "BENEFICIOS DE LA LEY 57-07", MARGIN, y, helveticaBold, 12, primary);
  y -= 24;
  const benefits = [
    ["Exención de impuestos de importación", "Cap. III — Art. 9"],
    ["Exención de impuesto sobre la renta", "Cap. III — Art. 10"],
    ["Reducción de impuestos por financiamiento externo", "Cap. III — Art. 11"],
    ["Crédito fiscal hasta 40% del costo de inversión", "Cap. III — Art. 12"],
  ];
  for (const [benefit, ref] of benefits) {
    drawRect(page5, MARGIN, y - 24, CONTENT_W, 24, light);
    drawText(page5, benefit, MARGIN + 10, y - 8, helvetica, 10, ink);
    drawText(page5, ref, PAGE_W - MARGIN - 10, y - 8, helveticaBold, 10, secondary, { align: "right" });
    y -= 30;
  }

  y -= 20;
  drawText(page5, "NOTAS Y DATOS IMPORTANTES", MARGIN, y, helveticaBold, 12, primary);
  y -= 24;
  const notes = [
    "Los pagos se realizan en USD o DOP a la tasa de venta del Banco Central del día.",
    "Los sistemas de inyección a red dejan de producir si se interrumpe el suministro eléctrico.",
    "El cálculo estimado se basa en el promedio de consumo anual del cliente.",
    "Equipos sujetos a disponibilidad; pueden reemplazarse por similares o superiores.",
  ];
  for (const note of notes) {
    drawText(page5, `—  ${note}`, MARGIN + 10, y, helvetica, 10, ink);
    y -= 20;
  }

  y -= 20;
  drawRect(page5, MARGIN, y - 50, CONTENT_W, 50, light);
  drawText(page5, "Importante.", MARGIN + 12, y - 16, helveticaBold, 9, primary);
  drawText(page5, "El cliente deberá cubrir entre RD$7,800 – RD$12,000 anuales durante 3 años por gastos de exoneración de impuestos (Ley 57-07).", MARGIN + 12, y - 30, helvetica, 9, muted);

  drawLine(page5, MARGIN, 40, PAGE_W - MARGIN, 40, primary, 2);
  drawText(page5, `${input.company.name.toUpperCase()}  ·  ENERGÍA SOLAR`, PAGE_W - MARGIN, 28, helveticaBold, 8, primary, { align: "right" });

}
