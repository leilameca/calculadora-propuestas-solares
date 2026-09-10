import { createHash, randomUUID } from "node:crypto";
import { prisma } from "../prisma";
import { getStorage, storageProvider } from "./index";
import { decodeDataUrl, safeFileName, validateFile } from "./validation";

export const fileUrl = (id: string) => `/api/files/${id}`;
export function fileId(value: string) { return /^\/api\/files\/([a-zA-Z0-9_-]+)$/.exec(value)?.[1]; }
export const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export async function uploadFile(companyId: string, bytes: Uint8Array, name: string, mimeType: string, imagesOnly = false) {
  await validateFile(bytes, mimeType, imagesOnly);
  const existing = await prisma.storedFile.findFirst({where:{companyId,sha256:sha256(bytes)}});
  if(existing)return {...existing,url:fileUrl(existing.id)};
  const provider = storageProvider(), storage = getStorage(provider);
  const key = `companies/${companyId}/${randomUUID()}`;
  const hash = sha256(bytes);
  await storage.upload(key, bytes, { mimeType, sha256: hash });
  try {
    // Read-back verification also works on S3-compatible services without checksum headers.
    if (sha256(await storage.read(key)) !== hash) throw new Error("Falló la verificación del objeto.");
    const record = await prisma.storedFile.create({ data: { companyId, key, provider, name: safeFileName(name), mimeType, size: bytes.length, sha256: hash } });
    return { ...record, url: fileUrl(record.id) };
  } catch (error) {
    await storage.delete(key).catch(() => console.error("storage.cleanup_failed", { key }));
    throw error;
  }
}

export async function ownedFile(value: string, companyId: string) {
  const id = fileId(value);
  if (!id) throw new Error("Referencia de archivo inválida.");
  const record = await prisma.storedFile.findFirst({ where: { id, companyId } });
  if (!record || !record.key.startsWith(`companies/${companyId}/`)) throw new Error("Archivo no encontrado.");
  return record;
}

export async function persistMedia(value: string | null | undefined, companyId: string, name = "imagen", imagesOnly = true) {
  if (!value) return value;
  if (value.startsWith("data:")) {
    const { bytes, mimeType } = decodeDataUrl(value);
    return (await uploadFile(companyId, bytes, name, mimeType, imagesOnly)).url;
  }
  const file = await ownedFile(value, companyId);
  if (imagesOnly && !file.mimeType.startsWith("image/")) throw new Error("Se requiere una imagen.");
  return value;
}

export async function resolveMedia(value: string | null | undefined, companyId: string) {
  if (!value) return undefined;
  if (value.startsWith("data:")) return value;
  if (!fileId(value)) { console.warn("storage.legacy_url_unavailable"); return undefined; }
  const record = await ownedFile(value, companyId);
  try {
    const bytes = await getStorage(record.provider).read(record.key);
    if (bytes.length !== record.size || sha256(bytes) !== record.sha256) throw new Error("Integridad de archivo inválida.");
    return `data:${record.mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch { console.warn("storage.object_unavailable", { id: record.id }); return undefined; }
}
