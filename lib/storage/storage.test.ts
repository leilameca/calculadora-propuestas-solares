import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { LocalObjectStorage } from "./local";
import { VercelBlobObjectStorage } from "./vercel-blob";
import { decodeDataUrl, safeFileName, validateFile } from "./validation";
import { getStorage } from "./index";

const directories: string[] = [];
afterEach(async () => { vi.unstubAllEnvs(); for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true }); });
describe("private storage", () => {
  it("round trips bytes, metadata and deletion without exposing local URLs", async () => {
    const root = await mkdtemp(join(tmpdir(), "heliopro-storage-")); directories.push(root);
    const storage = new LocalObjectStorage(root);
    const bytes = new TextEncoder().encode("fixture");
    await storage.upload("companies/tenant/file", bytes, { mimeType: "text/plain", sha256: "test" });
    expect(await storage.read("companies/tenant/file")).toEqual(bytes);
    expect(await storage.metadata("companies/tenant/file")).toMatchObject({ size: 7 });
    await expect(storage.getUrl("companies/tenant/file", { expiresIn: 60 })).rejects.toThrow("autenticada");
    await expect(storage.read("../outside")).rejects.toThrow();
    await storage.delete("companies/tenant/file");
    await expect(storage.read("companies/tenant/file")).rejects.toThrow();
  });
  it("fails closed in production and rejects spoofed MIME, oversized and malformed files", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("STORAGE_PROVIDER", "local");
    expect(() => getStorage()).toThrow();
    await expect(validateFile(Buffer.from("<script>bad</script>"), "application/pdf")).rejects.toThrow();
    await expect(validateFile(new Uint8Array(4 * 1024 * 1024 + 1), "application/pdf")).rejects.toThrow();
    expect(() => decodeDataUrl("data:image/png;base64,%%%")).toThrow();
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "white" } }).png().toBuffer();
    await expect(validateFile(png, "image/jpeg")).rejects.toThrow();
    await expect(validateFile(png, "image/png")).resolves.toBeUndefined();
    expect(safeFileName("../factura\r\n.pdf")).not.toMatch(/[/\r\n]/);
  });
  it("selects private Vercel Blob only when its server credential exists", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STORAGE_PROVIDER", "vercel-blob");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_test");
    expect(getStorage()).toBeInstanceOf(VercelBlobObjectStorage);
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    expect(() => getStorage()).toThrow("Vercel Blob privado");
  });
});
