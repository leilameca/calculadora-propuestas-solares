import type { PDFPage } from "pdf-lib";
import type { PdfContext } from "../types";
import { CONTENT_W, drawRect, drawText, MARGIN, PAGE_H, PAGE_W, wrap } from "./primitives";

/** Cursor and page ownership live here; pages only describe their content. */
export class PdfFlow {
  page!: PDFPage;
  y = 0;
  constructor(private readonly ctx: PdfContext, private readonly heading: string) { this.pageBreak(); }
  pageBreak() {
    const { pdf, primary, white, helveticaBold } = this.ctx;
    this.page = pdf.addPage([PAGE_W, PAGE_H]);
    drawRect(this.page, 0, PAGE_H - 60, PAGE_W, 60, primary);
    drawText(this.page, "PROPUESTA ENERGÉTICA", MARGIN, PAGE_H - 32, helveticaBold, 16, white);
    drawText(this.page, this.heading, MARGIN, PAGE_H - 95, helveticaBold, 18, primary);
    this.y = PAGE_H - 120;
  }
  ensure(height: number) { if (this.y - height < 65) this.pageBreak(); }
  paragraph(text: string, bold = false, size = 10) {
    const font = bold ? this.ctx.helveticaBold : this.ctx.helvetica;
    for (const line of wrap(text, font, size, CONTENT_W)) { this.ensure(size * 1.5); drawText(this.page, line, MARGIN, this.y, font, size, this.ctx.ink); this.y -= size * 1.5; }
    this.y -= 10;
  }
  table(headers: string[], rows: string[][], widths: number[]) {
    const { helvetica, helveticaBold, primary, white, ink, light } = this.ctx;
    const header = () => {
      this.ensure(28);
      drawRect(this.page, MARGIN, this.y - 22, CONTENT_W, 24, primary);
      let x = MARGIN;
      headers.forEach((text, i) => { drawText(this.page, text, x + 7, this.y - 14, helveticaBold, 9, white, { width: widths[i] - 14 }); x += widths[i]; });
      this.y -= 26;
    };
    header();
    rows.forEach((row, index) => {
      const cells = row.map((value, column) => wrap(value, helvetica, 9, widths[column] - 14));
      const count = Math.max(...cells.map(lines => lines.length));
      let offset = 0;
      while (offset < count) {
        if (this.y < 90) { this.pageBreak(); header(); }
        const take = Math.min(count - offset, Math.floor((this.y - 65 - 12) / 13));
        if (take < 1) { this.pageBreak(); header(); continue; }
        const height = take * 13 + 12;
        drawRect(this.page, MARGIN, this.y - height, CONTENT_W, height, index % 2 ? white : light);
        let x = MARGIN;
        cells.forEach((lines, column) => { lines.slice(offset, offset + take).forEach((line, lineIndex) => drawText(this.page, line, x + 7, this.y - 15 - lineIndex * 13, helvetica, 9, ink, { width: widths[column] - 14 })); x += widths[column]; });
        this.y -= height + 2;
        offset += take;
      }
    });
    this.y -= 12;
  }
}
