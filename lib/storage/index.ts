import { S3Client } from "@aws-sdk/client-s3";
import { LocalObjectStorage } from "./local";
import { S3ObjectStorage } from "./s3";
import { VercelBlobObjectStorage } from "./vercel-blob";
import type { ObjectStorage } from "./types";

export function storageProvider() {
  if (process.env.STORAGE_PROVIDER) return process.env.STORAGE_PROVIDER;
  if (process.env.BLOB_READ_WRITE_TOKEN || (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)) return "vercel-blob";
  return process.env.NODE_ENV === "production" ? "" : "local";
}
export function getStorage(provider = storageProvider()): ObjectStorage {
  if (provider === "local" && process.env.NODE_ENV !== "production") return new LocalObjectStorage(process.env.STORAGE_LOCAL_DIR || ".storage");
  if (provider === "vercel-blob") {
    if (!process.env.BLOB_READ_WRITE_TOKEN && !(process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)) throw new Error("Configure Vercel Blob privado antes de cargar archivos.");
    return new VercelBlobObjectStorage();
  }
  if (provider !== "s3" || !process.env.STORAGE_BUCKET) throw new Error("Configure Object Storage privado antes de cargar archivos.");
  return new S3ObjectStorage(new S3Client({
    region: process.env.STORAGE_REGION || "auto",
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
    credentials: process.env.STORAGE_ACCESS_KEY_ID && process.env.STORAGE_SECRET_ACCESS_KEY ? { accessKeyId: process.env.STORAGE_ACCESS_KEY_ID, secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY } : undefined,
  }), process.env.STORAGE_BUCKET);
}
