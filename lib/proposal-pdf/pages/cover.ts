import type { PdfContext } from "../types";
import { CONTENT_W, drawImageContain, drawImageCover, drawRect, drawText, formatNum, MARGIN, PAGE_H, PAGE_W } from "../components/primitives";

export function renderPage(ctx: PdfContext) {
  const { pdf, input, helvetica, helveticaBold, primary, secondary, accent, ink, muted, light, white, logo, cover } = ctx;
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  if (logo) drawImageContain(page, logo, MARGIN, PAGE_H - 76, 130, 38);
  else drawText(page, input.company.name.toUpperCase(), MARGIN, PAGE_H - 58, helveticaBold, 13, ink, { width: 240 });
  if (input.proposalNumber) drawText(page, `PROPUESTA / ${input.proposalNumber}`, PAGE_W - MARGIN, PAGE_H - 53, helveticaBold, 8, muted, { align: "right", width: 190 });
  drawText(page, ctx.date, PAGE_W - MARGIN, PAGE_H - 68, helvetica, 7.5, muted, { align: "right", width: 190 });

  const imageY = 410;
  const imageH = 265;
  if (cover) {
    drawImageCover(page, cover, MARGIN, imageY, CONTENT_W, imageH);
    page.drawRectangle({ x: MARGIN, y: imageY, width: CONTENT_W, height: imageH, color: ink, opacity: .18 });
  } else {
    drawRect(page, MARGIN, imageY, CONTENT_W, imageH, primary);
    page.drawRectangle({ x: MARGIN + CONTENT_W * .58, y: imageY, width: CONTENT_W * .42, height: imageH, color: secondary, opacity: .9 });
    drawRect(page, MARGIN + CONTENT_W * .82, imageY, CONTENT_W * .18, imageH * .48, accent);
  }
  drawText(page, input.project.name.toUpperCase(), MARGIN + 24, imageY + imageH - 38, helveticaBold, 9, white, { width: CONTENT_W - 48 });
  if (input.company.slogan) drawText(page, input.company.slogan, MARGIN + 24, imageY + 30, helvetica, 10, white, { width: CONTENT_W - 48 });

  drawText(page, "ENERGÍA SOLAR,", MARGIN, 352, helveticaBold, 30, ink, { width: CONTENT_W });
  drawText(page, "DISEÑADA PARA RENDIR.", MARGIN, 318, helveticaBold, 30, ink, { width: CONTENT_W });
  const location = input.customer.address || input.project.city;
  drawText(page, `Propuesta fotovoltaica para ${input.customer.name}${location ? ` · ${location}` : ""}`, MARGIN, 290, helvetica, 9.5, muted, { width: CONTENT_W });

  const metrics = [
    [`${input.result.installedKwp.toFixed(2)} kWp`, "Potencia"],
    [`${formatNum(input.result.annualGeneration)} kWh`, "Generación / año"],
    [String(input.result.panelCount), "Módulos"],
    [input.company.proposalValidityDays ? `${input.company.proposalValidityDays} días` : "", "Vigencia"],
  ].filter(([value]) => value);
  const cardW = CONTENT_W / metrics.length;
  metrics.forEach(([value, label], index) => {
    const x = MARGIN + cardW * index;
    drawRect(page, x, 190, cardW - 1, 64, light);
    drawText(page, value, x + 12, 222, helveticaBold, 15, index === 1 ? accent : ink, { width: cardW - 24 });
    drawText(page, label.toUpperCase(), x + 12, 202, helveticaBold, 7, muted, { width: cardW - 24 });
  });
  drawText(page, input.company.name, MARGIN, 28, helvetica, 7.5, muted, { width: CONTENT_W - 40 });
  drawText(page, "01", PAGE_W - MARGIN, 28, helvetica, 7.5, muted, { align: "right" });
}
