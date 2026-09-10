import type { PdfContext } from "../types";
import { drawText, drawRect, drawLine, PAGE_W, PAGE_H, MARGIN, CONTENT_W } from "../components/primitives";

export function renderPage(ctx: PdfContext) {
  const { pdf, input, helvetica, helveticaBold, primary, accent, ink, muted, light, white } = ctx;
  const page7 = pdf.addPage([PAGE_W, PAGE_H]);
  drawRect(page7, 0, PAGE_H - 60, PAGE_W, 60, primary);
  drawText(page7, "PROPUESTA ENERGÉTICA", MARGIN, PAGE_H - 30, helveticaBold, 16, white);
  drawText(page7, "06", PAGE_W - MARGIN, PAGE_H - 30, helveticaBold, 16, accent, { align: "right" });

  let y = PAGE_H - 100;
  drawText(page7, "Fases del Proyecto", MARGIN, y, helveticaBold, 18, primary);
  y -= 20;
  drawText(page7, "Proceso de implementación paso a paso", MARGIN, y, helvetica, 12, muted);
  y -= 40;

  const phases = [
    ["Aprobación Distribuidora", "Evaluación y aprobación por parte de la distribuidora eléctrica."],
    ["Instalación de Equipos", "Montaje de paneles, inversor, estructura y cableado en sitio."],
    ["Visita de Supervisión", "Inspección técnica oficial de la instalación."],
    ["Acuerdos de Interconexión", "Firma de documentos de conexión a la red eléctrica."],
    ["Carta Medidor Bidireccional", "Emisión de carta oficial para instalación del medidor."],
    ["Instalación del Medidor", "Instalación del contador bidireccional por la distribuidora."],
    ["Arranque del Sistema", "Puesta en marcha y verificación del sistema fotovoltaico."],
  ];

  phases.forEach(([title, desc], index) => {
    const isLast = index === phases.length - 1;
    drawRect(page7, MARGIN, y - 40, 40, 40, isLast ? accent : primary);
    drawText(page7, String(index + 1), MARGIN + 20, y - 14, helveticaBold, 16, isLast ? ink : white, { align: "center" });
    drawText(page7, title, MARGIN + 60, y - 14, helveticaBold, 12, ink);
    drawText(page7, desc, MARGIN + 60, y - 28, helvetica, 9, muted);
    y -= 52;
  });

  y -= 20;
  drawRect(page7, MARGIN, y - 50, CONTENT_W, 50, light);
  drawText(page7, "Importante.", MARGIN + 12, y - 16, helveticaBold, 9, primary);
  drawText(page7, "Cada proceso está sujeto a las reglas de la distribuidora eléctrica. La empresa no es responsable de atrasos causados por dicha institución, y gestiona todos los trámites ante CNE, distribuidoras y DGII.", MARGIN + 12, y - 30, helvetica, 9, muted);

  drawLine(page7, MARGIN, 40, PAGE_W - MARGIN, 40, primary, 2);
  drawText(page7, `${input.company.name.toUpperCase()}  ·  ENERGÍA SOLAR`, PAGE_W - MARGIN, 28, helveticaBold, 8, primary, { align: "right" });

}
