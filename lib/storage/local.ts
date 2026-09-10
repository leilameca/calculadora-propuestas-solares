import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { ObjectMetadata, ObjectStorage } from "./types";

/** Development adapter. Files are deliberately outside public/. */
export class LocalObjectStorage implements ObjectStorage {
  constructor(private readonly root: string) {}
  private path(key: string) {
    if (!/^[a-zA-Z0-9/_-]+$/.test(key)) throw new Error("Storage key inválida.");
    const base = resolve(this.root), path = resolve(base, key);
    if (!path.startsWith(base + sep)) throw new Error("Storage key fuera del directorio.");
    return path;
  }
  async upload(key: string, bytes: Uint8Array, metadata: { mimeType: string; sha256: string }) {
    const path = this.path(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes, { flag: "wx" });
    const result = { key, size: bytes.length, ...metadata };
    await writeFile(path + ".json", JSON.stringify(result), { flag: "wx" });
    return result;
  }
  async delete(key: string) {
    await unlink(this.path(key)).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
    await unlink(this.path(key) + ".json").catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
  }
  async read(key: string) { return new Uint8Array(await readFile(this.path(key))); }
  async metadata(key: string): Promise<ObjectMetadata> { return JSON.parse(await readFile(this.path(key) + ".json", "utf8")) as ObjectMetadata; }
  async getUrl(_key: string, _options: { expiresIn: number }): Promise<string> {
    throw new Error("El almacenamiento local solo permite la ruta autenticada /api/files/:id.");
  }
}
