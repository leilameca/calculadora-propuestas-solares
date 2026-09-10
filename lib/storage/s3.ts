import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ObjectStorage } from "./types";

export class S3ObjectStorage implements ObjectStorage {
  constructor(private readonly client: S3Client, private readonly bucket: string) {}
  async upload(key: string, bytes: Uint8Array, metadata: { mimeType: string; sha256: string }) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: metadata.mimeType, Metadata: { sha256: metadata.sha256 } }));
    return { key, size: bytes.length, ...metadata };
  }
  async delete(key: string) { await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })); }
  async read(key: string) {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!result.Body) throw new Error("Objeto sin contenido.");
    return result.Body.transformToByteArray();
  }
  async metadata(key: string) {
    const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    return { key, size: result.ContentLength ?? 0, mimeType: result.ContentType ?? "application/octet-stream", sha256: result.Metadata?.sha256 };
  }
  async getUrl(key: string, { expiresIn }: { expiresIn: number }) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: Math.min(900, Math.max(1, expiresIn)) });
  }
}
