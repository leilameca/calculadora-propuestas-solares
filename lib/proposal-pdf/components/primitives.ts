import { rgb, type PDFFont, type PDFPage, type PDFPageDrawTextOptions, type RGB } from "pdf-lib";
export const PAGE_W = 612, PAGE_H = 792, MARGIN = 48, CONTENT_W = PAGE_W - MARGIN * 2;
export function safeText(value: unknown): string {
  return String(value ?? "").normalize("NFC").replace(/₂/g, "2").replace(/→/g, "->").replace(/[\u2010-\u2015]/g, "-").replace(/[^\x20-\x7e\xa0-\xff\n\r\t€‘’“”•…]/gu, "?");
}
export function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of safeText(text).split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (font.widthOfTextAtSize(`${line}${line ? " " : ""}${word}`, size) <= width) { line += `${line ? " " : ""}${word}`; continue; }
      if (line) lines.push(line);
      line = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(line + char, size) > width && line) { lines.push(line); line = ""; }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}
export function drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color = rgb(.09, .13, .2), options: Partial<PDFPageDrawTextOptions> & { align?: "left" | "right" | "center"; width?: number } = {}) {
  const { align = "left", width = align === "center" ? Math.min(x - MARGIN, PAGE_W - MARGIN - x) * 2 : align === "right" ? x - MARGIN : PAGE_W - MARGIN - x, ...rest } = options;
  let value = safeText(text).replace(/[\r\n\t]/g, " ");
  let actualSize = Math.min(size, size * width / Math.max(1, font.widthOfTextAtSize(value, size)));
  if (actualSize < 7) { actualSize = 7; while (value.length && font.widthOfTextAtSize(value + "...", actualSize) > width) value = value.slice(0, -1); value += "..."; }
  const length = font.widthOfTextAtSize(value, actualSize);
  page.drawText(value, { x: align === "right" ? x - length : align === "center" ? x - length / 2 : x, y, font, size: actualSize, color, ...rest });
}
export function drawRect(page: PDFPage, x: number, y: number, width: number, height: number, color: RGB) { page.drawRectangle({ x, y, width, height, color }); }
export function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, color: RGB, thickness = 1) { page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness }); }
export const formatUsd = (value: number) => `US$ ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const formatDop = (value: number) => `RD$ ${Math.round(value).toLocaleString("es-DO")}`;
export const formatNum = (value: number) => Math.round(value).toLocaleString("es-DO");
export function hexToRgb(value: string, fallback: string) { const hex = value.replace("#", ""); const safe = /^[0-9a-f]{6}$/i.test(hex) ? hex : fallback; return rgb(parseInt(safe.slice(0, 2), 16) / 255, parseInt(safe.slice(2, 4), 16) / 255, parseInt(safe.slice(4, 6), 16) / 255); }
