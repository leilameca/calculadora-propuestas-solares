import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { normalizeProposal } from "../proposal-validation";
import { prepareProposalAssets } from "../proposal-assets";
import type { ProposalDocumentInput } from "../proposal-types";
import type { PdfContext } from "./types";
import { drawText, hexToRgb, MARGIN, PAGE_W } from "./components/primitives";
import { renderPage as coverPage } from "./pages/cover";
import { renderPage as summaryPage } from "./pages/summary";
import { renderPage as quotePage } from "./pages/quote";
import { renderPage as analysisPage } from "./pages/analysis";
import { renderPage as conditionsPage } from "./pages/conditions";
import { renderPage as warrantiesPage } from "./pages/warranties";
import { renderPage as phasesPage } from "./pages/phases";
import { renderPage as backPage } from "./pages/back-cover";
import { appendAttachments } from "./pages/attachments";

export async function buildProposalPdf(value: ProposalDocumentInput): Promise<Uint8Array> {
  const input = await prepareProposalAssets(normalizeProposal(value));
  const pdf = await PDFDocument.create();
  const image = async (data?: string) => data ? pdf.embedPng(Buffer.from(data.split(",")[1], "base64")) : null;
  const quoteSubtotal = input.quoteItems.reduce((sum, item) => sum + item.amountUsd, 0);
  const quoteTax = input.company.itbisEnabled === false ? 0 : quoteSubtotal * (input.company.itbisRate ?? .18);
  const quoteTotal = quoteSubtotal + quoteTax;
  const ctx: PdfContext = {
    pdf, input, helvetica: await pdf.embedFont(StandardFonts.Helvetica), helveticaBold: await pdf.embedFont(StandardFonts.HelveticaBold), helveticaOblique: await pdf.embedFont(StandardFonts.HelveticaOblique),
    primary: hexToRgb(input.company.primaryColor, "0F4C5C"), secondary: hexToRgb(input.company.secondaryColor, "2F7D32"), accent: hexToRgb(input.company.accentColor, "F2A900"), ink: rgb(.09, .13, .2), muted: rgb(.4, .45, .55), light: rgb(.95, .96, .98), white: rgb(1, 1, 1),
    date: input.date || new Intl.DateTimeFormat("es-DO", { dateStyle: "long" }).format(new Date()), quoteSubtotal, quoteTax, quoteTotal, quoteTotalDop: quoteTotal * (input.project.exchangeRate ?? 0), quotePricePerWp: input.result.installedKwp > 0 ? quoteTotal / (input.result.installedKwp * 1000) : 0,
    customerLogo: await image(input.customer.logoBase64),
    logo: await image(input.company.logoBase64), cover: await image(input.company.coverImageBase64), backCover: await image(input.company.backCoverImageBase64),
  };
  for (const render of [coverPage, summaryPage, quotePage, analysisPage, conditionsPage, warrantiesPage, phasesPage]) render(ctx);
  await appendAttachments(ctx);
  backPage(ctx);
  pdf.getPages().forEach((page, i) => {
    // Imported annexes keep their original artwork, without an overlay.
    if (page.getWidth() === PAGE_W && !page.node.has(pdf.context.obj("HelioProAnnex"))) drawText(page, String(i + 1).padStart(2, "0"), PAGE_W - MARGIN, 16, ctx.helvetica, 8, i === pdf.getPageCount() - 1 ? ctx.white : ctx.muted, { align: "right" });
  });
  pdf.setTitle(`Propuesta energética - ${input.customer.name}`); pdf.setAuthor(input.company.name);
  return pdf.save();
}
