import type { PdfContext } from "../types";
import { CONTENT_W, drawImageContain, drawImageCover, drawRect, drawText, MARGIN, PAGE_H, PAGE_W, wrap } from "../components/primitives";

export function renderPage(ctx: PdfContext) {
  const { pdf, input, helvetica, helveticaBold, primary, secondary, accent, ink, muted, white, logo, cover, backCover } = ctx;
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  drawText(page, "09 / CIERRE", MARGIN, PAGE_H - 38, helveticaBold, 8, accent);
  drawText(page, "El siguiente paso debe sentirse sencillo.", MARGIN, PAGE_H - 82, helveticaBold, 26, ink, { width: CONTENT_W });

  const image = backCover || cover;
  const blockY = 180;
  const blockH = 455;
  if (image) {
    drawImageCover(page, image, MARGIN, blockY, CONTENT_W, blockH);
    page.drawRectangle({ x: MARGIN, y: blockY, width: CONTENT_W, height: blockH, color: ink, opacity: .52 });
  } else {
    drawRect(page, MARGIN, blockY, CONTENT_W, blockH, primary);
    page.drawRectangle({ x: MARGIN + CONTENT_W * .64, y: blockY, width: CONTENT_W * .36, height: blockH, color: secondary, opacity: .9 });
    drawRect(page, MARGIN + CONTENT_W * .80, blockY, CONTENT_W * .20, blockH * .36, accent);
  }
  drawText(page, "TRANSFORMEMOS", MARGIN + 28, blockY + 285, helveticaBold, 27, white, { width: CONTENT_W - 56 });
  drawText(page, "SU ENERGÍA.", MARGIN + 28, blockY + 252, helveticaBold, 27, white, { width: CONTENT_W - 56 });
  if (input.company.slogan) wrap(input.company.slogan, helvetica, 11, CONTENT_W - 56).slice(0, 3).forEach((line, index) => drawText(page, line, MARGIN + 28, blockY + 205 - index * 16, helvetica, 11, white));

  if (logo) drawImageContain(page, logo, MARGIN, 102, 125, 42);
  else drawText(page, input.company.name, MARGIN, 120, helveticaBold, 11, ink, { width: 150 });
  const contacts = [input.company.phone, input.company.email, input.company.website].filter((value): value is string => Boolean(value));
  if (contacts.length) drawText(page, contacts.join(" · "), MARGIN + 155, 120, helvetica, 8, muted, { width: CONTENT_W - 155 });
  const identity = [input.company.address, input.company.rnc ? `RNC ${input.company.rnc}` : ""].filter(Boolean).join(" · ");
  if (identity) drawText(page, identity, MARGIN + 155, 103, helvetica, 8, muted, { width: CONTENT_W - 155 });
  if (input.company.proposalValidityDays) drawText(page, `Vigencia: ${input.company.proposalValidityDays} días`, MARGIN, 72, helvetica, 8, muted);
  drawText(page, "09", PAGE_W - MARGIN, 28, helvetica, 7.5, muted, { align: "right" });
}
