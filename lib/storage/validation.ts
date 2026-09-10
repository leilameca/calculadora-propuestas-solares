import sharp from "sharp";

export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const FILE_TYPES = ["application/pdf", ...IMAGE_TYPES] as const;

export function safeFileName(name: string): string {
  // eslint-disable-next-line no-control-regex -- Strip control bytes from download filenames.
  return name.normalize("NFC").replace(/[\\/\x00-\x1f\x7f<>:"|?*]/g, "_").slice(0, 150).trim() || "archivo";
}

export function decodeDataUrl(value: string): { bytes: Buffer; mimeType: string } {
  if (value.length > Math.ceil(MAX_FILE_BYTES * 4 / 3) + 100) throw new Error("El archivo excede 4 MB.");
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new Error("Archivo Base64 inválido.");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.toString("base64") !== match[2]) throw new Error("Base64 no canónico.");
  return { bytes, mimeType: match[1].toLowerCase() };
}

export async function validateFile(bytes: Uint8Array, mimeType: string, imagesOnly = false): Promise<void> {
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error("El archivo debe pesar entre 1 byte y 4 MB.");
  const accepted: readonly string[] = imagesOnly ? IMAGE_TYPES : FILE_TYPES;
  if (!accepted.includes(mimeType)) throw new Error("Formato no admitido. Use PDF, PNG, JPEG o WebP.");
  const buffer = Buffer.from(bytes);
  if (mimeType === "application/pdf") {
    if (buffer.subarray(0, 5).toString() !== "%PDF-") throw new Error("La firma del archivo no corresponde a un PDF.");
    return;
  }
  const meta = await sharp(buffer, { limitInputPixels: 20_000_000 }).metadata();
  const formats: Record<string, string> = { "image/png": "png", "image/jpeg": "jpeg", "image/webp": "webp" };
  if (meta.format !== formats[mimeType] || !meta.width || !meta.height || (meta.pages ?? 1) > 1) throw new Error("Imagen inválida o animada.");
  await sharp(buffer, { limitInputPixels: 20_000_000 }).stats();
}
