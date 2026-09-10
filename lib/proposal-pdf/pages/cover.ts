import type { PdfContext } from "../types";
import { drawText, drawRect, drawLine, formatNum, PAGE_W, PAGE_H, MARGIN, CONTENT_W } from "../components/primitives";

export function renderPage(ctx: PdfContext) {
  const { pdf, input, helvetica, helveticaBold, primary, secondary, accent, ink, muted, light, white, logo, cover, customerLogo } = ctx;
  const page1 = pdf.addPage([PAGE_W, PAGE_H]);

  drawRect(page1, 0, PAGE_H - 260, PAGE_W, 260, primary);

  if (logo) {
    const dims = logo.scaleToFit(120,50);
    page1.drawImage(logo, { x: MARGIN, y: PAGE_H - 120, width: dims.width, height: dims.height });
  } else {
    drawText(page1, input.company.name.toUpperCase(), MARGIN, PAGE_H - 90, helveticaBold, 18, white);
  }

  drawText(page1, "PROPUESTA", MARGIN, PAGE_H - 190, helveticaBold, 44, white);
  drawText(page1, "ENERGÉTICA", MARGIN, PAGE_H - 230, helveticaBold, 44, accent);
  drawText(page1, "SISTEMA SOLAR FOTOVOLTAICO", MARGIN, PAGE_H - 255, helvetica, 12, white);

  if (cover) {
    const coverW = CONTENT_W;
    const coverH = 150;
    const coverY = PAGE_H - 260 - coverH - 20;
    page1.drawImage(cover, { x: MARGIN, y: coverY, width: coverW, height: coverH });

  } else {
    drawRect(page1, MARGIN, PAGE_H - 460, CONTENT_W, 180, light);
    drawText(page1, "FOTOGRAFÍA AÉREA / PROYECTO", MARGIN + 20, PAGE_H - 400, helveticaBold, 14, primary);
    drawText(page1, input.project.city, MARGIN + 20, PAGE_H - 380, helvetica, 12, muted);
  }

  const prepY = PAGE_H - 550;
  drawRect(page1, MARGIN, prepY - 20, CONTENT_W, 100, light);
  if(customerLogo){const size=customerLogo.scaleToFit(65,20);page1.drawImage(customerLogo,{x:PAGE_W-MARGIN-80,y:prepY+65,...size});}
  drawText(page1, "PREPARADO PARA", MARGIN + 16, prepY + 60, helveticaBold, 11, secondary);
  drawText(page1, input.customer.name, MARGIN + 16, prepY + 36, helveticaBold, 20, ink);
  drawText(page1, input.customer.address || input.project.city, MARGIN + 16, prepY + 16, helvetica, 11, muted);

  const badgeY = prepY - 60;
  const badgeW = (CONTENT_W - 20) / 2;
  drawRect(page1, MARGIN, badgeY - 50, badgeW, 50, primary);
  drawText(page1, `${formatNum(input.result.annualGeneration)} kWh`, MARGIN + 12, badgeY - 18, helveticaBold, 16, white, {width:badgeW-24});
  drawText(page1, "GENERADOS / AÑO", MARGIN + 12, badgeY - 30, helvetica, 9, white);

  drawRect(page1, MARGIN + badgeW + 20, badgeY - 50, badgeW, 50, accent);
  drawText(page1, "25+", MARGIN + badgeW + 32, badgeY - 12, helveticaBold, 16, ink);
  drawText(page1, "AÑOS DE VIDA ÚTIL", MARGIN + badgeW + 32, badgeY - 30, helvetica, 9, ink);

  drawLine(page1, MARGIN, 40, PAGE_W - MARGIN, 40, primary, 2);
  drawText(page1, `${input.company.name.toUpperCase()}  ·  ENERGÍA SOLAR`, PAGE_W - MARGIN, 28, helveticaBold, 8, primary, { align: "right" });

}
