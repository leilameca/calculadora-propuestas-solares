export interface ObjectMetadata {
  key: string;
  size: number;
  mimeType: string;
  sha256?: string;
}

export interface ObjectStorage {
  upload(key: string, bytes: Uint8Array, metadata: { mimeType: string; sha256: string }): Promise<ObjectMetadata>;
  delete(key: string): Promise<void>;
  read(key: string): Promise<Uint8Array>;
  metadata(key: string): Promise<ObjectMetadata>;
  getUrl(key: string, options: { expiresIn: number }): Promise<string>;
}
