import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { AppUser } from "@/services/user.service";

const LOCAL_ROOT = path.join(process.cwd(), "storage", "generated-images");

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

function extensionForMime(mimeType: string) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/jpeg") return ".jpg";
  return ".bin";
}

function buildLocalKey(generationId: string, userKey: string, mimeType: string) {
  const ext = extensionForMime(mimeType);
  const name = `${sanitize(generationId)}-${randomUUID()}${ext}`;
  return {
    relativeDir: path.posix.join("storage", "generated-images", sanitize(userKey)),
    fileName: name,
    key: path.posix.join("storage", "generated-images", sanitize(userKey), name),
  };
}

async function uploadLocal(buffer: Buffer, generationId: string, userKey: string, mimeType: string) {
  const target = buildLocalKey(generationId, userKey, mimeType);
  const absoluteDir = path.join(process.cwd(), target.relativeDir);
  await fs.mkdir(absoluteDir, { recursive: true });
  const absolute = path.join(absoluteDir, target.fileName);
  await fs.writeFile(absolute, buffer);
  return { provider: "local", key: target.key } as const;
}

export async function saveGeneratedImage(input: {
  generationId: string;
  userKey: string;
  mimeType: string;
  buffer: Buffer;
}) {
  return uploadLocal(input.buffer, input.generationId, input.userKey, input.mimeType);
}

type StorageManifest = {
  id: string;
  prompt: string;
  enhancedPrompt?: string | null;
  stylePreset?: string | null;
  aspectRatio?: string;
  quality?: string;
  background?: string | null;
  provider: string;
  model: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  createdAt: string;
  imageKey: string;
};

function manifestKeyForImageKey(imageKey: string) {
  return imageKey.replace(/\.[^.]+$/, ".json");
}

export async function writeGeneratedImageManifest(input: {
  manifest: StorageManifest;
  storageProvider: string;
  imageKey: string;
}) {
  const key = manifestKeyForImageKey(input.imageKey);
  const body = JSON.stringify(input.manifest);

  if (input.storageProvider === "s3") {
    // S3 manifests are not supported since AWS SDK has been removed
  }

  await fs.mkdir(path.dirname(path.join(process.cwd(), key)), { recursive: true });
  await fs.writeFile(path.join(process.cwd(), key), body, "utf8");
}

async function readLocalManifest(key: string) {
  const text = await fs.readFile(path.join(process.cwd(), key), "utf8");
  return JSON.parse(text) as StorageManifest;
}

export async function listGeneratedImageHistoryFromStorage(subjectKey: string) {
  const safeKey = sanitize(subjectKey);

  const root = path.join(LOCAL_ROOT, safeKey);
  const files = await fs.readdir(root).catch(() => [] as string[]);
  const manifests = await Promise.all(
    files
      .filter((name) => name.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, Number(process.env.GENERATED_IMAGES_HISTORY_LIMIT || 24))
      .map(async (name) => {
        try {
          const manifest = await readLocalManifest(path.posix.join("storage", "generated-images", safeKey, name));
          return {
            id: manifest.id,
            status: "succeeded",
            prompt: manifest.prompt,
            enhancedPrompt: manifest.enhancedPrompt || null,
            stylePreset: manifest.stylePreset || null,
            aspectRatio: manifest.aspectRatio || "1:1",
            quality: manifest.quality || "standard",
            background: manifest.background || null,
            provider: manifest.provider,
            model: manifest.model,
            mimeType: manifest.mimeType,
            width: manifest.width || null,
            height: manifest.height || null,
            errorMessage: null,
            imageUrl: `/${manifest.imageKey}`,
            createdAt: manifest.createdAt,
          };
        } catch {
          return null;
        }
      })
  );

  return manifests.filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function buildGeneratedImageDownload(input: { generationId: string; requester: AppUser }) {
  const generation = await prisma.generatedImage.findUnique({
    where: { id: input.generationId },
    select: {
      id: true,
      userId: true,
      mimeType: true,
      storageProvider: true,
      storageKey: true,
    },
  });

  if (!generation || !generation.storageKey || !generation.storageProvider || !generation.mimeType) {
    throw new Error("Generated image not found");
  }

  const isOwner = generation.userId === input.requester.id;
  const isAdmin = input.requester.role.toLowerCase() === "admin";
  if (!isOwner && !isAdmin) {
    throw new Error("Not allowed");
  }

  if (generation.storageProvider === "s3") {
    throw new Error("S3 storage provider is no longer supported.");
  }

  return {
    mode: "stream" as const,
    stream: createReadStream(path.join(process.cwd(), generation.storageKey)),
    mimeType: generation.mimeType,
  };
}

export async function cleanupGeneratedImageStorage(generationId: string) {
  const generation = await prisma.generatedImage.findUnique({
    where: { id: generationId },
    select: {
      storageProvider: true,
      storageKey: true,
    },
  });

  if (!generation?.storageKey || !generation.storageProvider) return;

  if (generation.storageProvider === "s3") {
    // S3 cleanup is not possible since AWS SDK has been removed
    return;
  }

  await fs.unlink(path.join(process.cwd(), generation.storageKey)).catch(() => undefined);
}
