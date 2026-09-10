import type { PdfContext } from "../types";
import { drawText, drawRect, PAGE_W, PAGE_H, MARGIN } from "../components/primitives";

export function renderPage(ctx: PdfContext) {
  const { pdf, input, helvetica, helveticaBold, primary, accent, muted, white, cover, backCover } = ctx;
  const page8 = pdf.addPage([PAGE_W, PAGE_H]);
  drawRect(page8, 0, 0, PAGE_W, PAGE_H, primary);

  if (backCover || cover) {
    const coverW = PAGE_W;
    const coverH = 300;
    page8.drawImage((backCover || cover)!, { x: 0, y: PAGE_H - coverH, width: coverW, height: coverH });
  }

  drawText(page8, "Transformemos su energía", PAGE_W / 2, PAGE_H - 380, helveticaBold, 28, white, { align: "center" });
  drawText(page8, "Solicite su cotización sin compromiso — sin costo ni obligación.", PAGE_W / 2, PAGE_H - 410, helvetica, 12, white, { align: "center" });

  const contactY = PAGE_H - 480;
  drawText(page8, "TELÉFONO", PAGE_W / 2, contactY, helveticaBold, 10, accent, { align: "center" });
  drawText(page8, input.company.phone || "N/D", PAGE_W / 2, contactY - 18, helvetica, 12, white, { align: "center" });
  drawText(page8, "EMAIL", PAGE_W / 2, contactY - 50, helveticaBold, 10, accent, { align: "center" });
  drawText(page8, input.company.email || "N/D", PAGE_W / 2, contactY - 68, helvetica, 12, white, { align: "center" });
  drawText(page8, "UBICACIÓN", PAGE_W / 2, contactY - 100, helveticaBold, 10, accent, { align: "center" });
  drawText(page8, input.company.address || "República Dominicana", PAGE_W / 2, contactY - 118, helvetica, 12, white, { align: "center" });

  const badgeY = 95;
  const badgeW = (PAGE_W - 2 * MARGIN - 20) / 3;
  drawRect(page8, MARGIN, badgeY, badgeW, 50, white);
  drawText(page8, "25+", MARGIN + badgeW / 2, badgeY + 18, helveticaBold, 16, primary, { align: "center" });
  drawText(page8, "AÑOS VIDA ÚTIL", MARGIN + badgeW / 2, badgeY + 4, helvetica, 8, muted, { align: "center" });

  drawRect(page8, MARGIN + badgeW + 10, badgeY, badgeW, 50, white);
  drawText(page8, "0", MARGIN + badgeW + 10 + badgeW / 2, badgeY + 18, helveticaBold, 16, primary, { align: "center" });
  drawText(page8, "EMISIÓN CO₂", MARGIN + badgeW + 10 + badgeW / 2, badgeY + 4, helvetica, 8, muted, { align: "center" });

  drawRect(page8, MARGIN + 2 * (badgeW + 10), badgeY, badgeW, 50, white);
  drawText(page8, "24/7", MARGIN + 2 * (badgeW + 10) + badgeW / 2, badgeY + 18, helveticaBold, 16, primary, { align: "center" });
  drawText(page8, "SOPORTE TÉCNICO", MARGIN + 2 * (badgeW + 10) + badgeW / 2, badgeY + 4, helvetica, 8, muted, { align: "center" });

  drawText(page8, `${input.company.name.toUpperCase()}  ·  RD`, PAGE_W / 2, 40, helveticaBold, 12, white, { align: "center" });
  drawText(page8, `${input.company.name.toUpperCase()}  ·  ENERGÍA SOLAR`, PAGE_W - MARGIN, 28, helveticaBold, 8, white, { align: "right" });

}
