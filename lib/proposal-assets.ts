import sharp from "sharp";
import { decodeDataUrl, MAX_FILE_BYTES } from "./storage/validation";
import { resolveMedia } from "./storage/files";
import type { ProposalDocumentInput } from "./proposal-types";

export async function safeImage(value?: string) {
  if (!value) return undefined;
  try {
    const { bytes, mimeType } = decodeDataUrl(value);
    if (!mimeType.startsWith("image/")) return undefined;
    let png = await sharp(bytes, { limitInputPixels: 20_000_000 }).rotate().resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true }).png().toBuffer();
    // A compact JPEG can expand beyond the upload limit when converted to PNG.
    if (png.length > MAX_FILE_BYTES) png = await sharp(png).resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: true }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch { console.warn("proposal.image_unavailable"); return undefined; }
}

export async function prepareProposalAssets(input: ProposalDocumentInput, companyId?: string): Promise<ProposalDocumentInput> {
  const resolve = async (value?: string | null) => companyId ? resolveMedia(value, companyId) : value ?? undefined;
  const image = async (value?: string | null) => safeImage(await resolve(value));
  return {
    ...input,
    company: { ...input.company, logoBase64: await image(input.company.logoBase64), coverImageBase64: await image(input.company.coverImageBase64), backCoverImageBase64: await image(input.company.backCoverImageBase64) },
    customer: { ...input.customer, logoBase64: await image(input.customer.logoBase64) },
    selectedEquipment: await Promise.all((input.selectedEquipment ?? []).map(async item => ({ ...item, logoUrl: await image(item.logoUrl) }))),
    invoice: input.invoice ? { ...input.invoice, dataUrl: (await resolve(input.invoice.dataUrl)) ?? "" } : undefined,
    attachments: await Promise.all((input.attachments ?? []).map(async item => ({ ...item, dataUrl: (await resolve(item.dataUrl)) ?? "" }))),
  };
}
