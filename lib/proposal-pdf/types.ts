import type { PDFDocument, PDFFont, PDFImage, RGB } from "pdf-lib";
import type { ProposalDocumentInput } from "../proposal-types";
export interface PdfContext {
  pdf: PDFDocument; input: ProposalDocumentInput;
  helvetica: PDFFont; helveticaBold: PDFFont; helveticaOblique: PDFFont;
  primary: RGB; secondary: RGB; accent: RGB; ink: RGB; muted: RGB; light: RGB; white: RGB;
  date: string; quoteSubtotal: number; quoteTax: number; quoteTotal: number; quoteTotalDop: number; quotePricePerWp: number;
  customerLogo: PDFImage | null;
  logo: PDFImage | null; cover: PDFImage | null; backCover: PDFImage | null;
}
