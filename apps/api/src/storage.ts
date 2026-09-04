import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

export interface ObjectStore {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export class LocalObjectStore implements ObjectStore {
  constructor(private readonly root: string) {}

  private file(key: string): string {
    return path.join(this.root, key.replace(/[^a-zA-Z0-9/._-]/g, '_'));
  }

  async put(key: string, body: Buffer): Promise<void> {
    const file = this.file(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.file(key));
  }

  async delete(key: string): Promise<void> {
    await unlink(this.file(key));
  }
}

export function createObjectStore(): ObjectStore {
  const mode = process.env.OBJECT_STORE ?? 'local';
  if (mode !== 'local') {
    throw new Error('S3 object store is not wired in this environment. Use OBJECT_STORE=local for development.');
  }
  return new LocalObjectStore(process.env.LOCAL_OBJECT_DIR ?? './data/objects');
}
