import fs from "fs/promises";
import { createReadStream, existsSync } from "fs";
import path from "path";

export const STORAGE_ROOT = process.env.STORAGE_PATH || path.join(process.cwd(), "storage");

export function storageRelativePath(...segments: string[]): string {
  return path.posix.join(...segments);
}

export function getAbsolutePath(relativePath: string): string {
  return path.join(STORAGE_ROOT, relativePath);
}

export async function writeStorageFile(relativePath: string, data: Buffer): Promise<{ relativePath: string; absolutePath: string }> {
  const absolutePath = getAbsolutePath(relativePath);
  const dir = path.dirname(absolutePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(absolutePath, data);
  return { relativePath, absolutePath };
}

export async function deleteStorageFile(relativePath: string): Promise<void> {
  const absolutePath = getAbsolutePath(relativePath);
  await fs.unlink(absolutePath).catch(() => undefined);
}

export function createStorageReadStream(relativePath: string) {
  const absolutePath = getAbsolutePath(relativePath);
  return createReadStream(absolutePath);
}

export function storageFileExists(relativePath: string): boolean {
  return existsSync(getAbsolutePath(relativePath));
}
