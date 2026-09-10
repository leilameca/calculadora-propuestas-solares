import { del, get, head, issueSignedToken, presignUrl, put } from "@vercel/blob";
import type { ObjectStorage } from "./types";

const privateAccess = { access: "private" as const };

export class VercelBlobObjectStorage implements ObjectStorage {
  async upload(key: string, bytes: Uint8Array, metadata: { mimeType: string; sha256: string }) {
    const blob = await put(key, Buffer.from(bytes), {
      ...privateAccess,
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: metadata.mimeType,
      cacheControlMaxAge: 60,
    });
    return { key: blob.pathname, size: bytes.length, ...metadata };
  }

  async delete(key: string) {
    await del(key);
  }

  async read(key: string) {
    const result = await get(key, { ...privateAccess, useCache: false });
    if (!result || result.statusCode !== 200) throw new Error("Objeto no encontrado.");
    return new Uint8Array(await new Response(result.stream).arrayBuffer());
  }

  async metadata(key: string) {
    const blob = await head(key);
    return { key: blob.pathname, size: blob.size, mimeType: blob.contentType || "application/octet-stream" };
  }

  async getUrl(key: string, { expiresIn }: { expiresIn: number }) {
    const validUntil = Date.now() + Math.min(900, Math.max(1, expiresIn)) * 1000;
    const token = await issueSignedToken({ pathname: key, operations: ["get"], validUntil });
    return (await presignUrl(token, { ...privateAccess, operation: "get", pathname: key, validUntil })).presignedUrl;
  }
}
