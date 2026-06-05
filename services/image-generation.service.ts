import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import type { AppUser } from "@/services/user.service";
import { enforceRateLimit } from "@/services/rate-limit.service";
import { listGeneratedImageHistoryFromStorage, saveGeneratedImage, writeGeneratedImageManifest } from "@/services/generated-image-storage.service";

type CreateImageInput = {
  user: AppUser;
  prompt: string;
  stylePreset?: string;
  aspectRatio?: string;
  quality?: string;
  background?: string;
};

type ProviderResult = {
  mimeType: string;
  buffer: Buffer;
  width?: number;
  height?: number;
  seed?: string | null;
};

const openaiClient = process.env.THREE_D_GENERATION_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.THREE_D_GENERATION_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    })
  : null;

const STYLE_PRESETS: Record<string, string> = {
  product: "high-end 3D product render, studio lighting, physically based materials",
  character: "stylized 3D character render, expressive pose, cinematic lighting",
  environment: "detailed 3D environment render, depth, global illumination, cinematic composition",
  isometric: "clean isometric 3D render, crisp geometry, premium lighting",
  toy: "premium collectible toy render, glossy materials, subtle shadows",
};

function getImageProvider() {
  const configured = (process.env.IMAGE_GENERATION_PROVIDER || "").trim().toLowerCase();
  if (configured === "openai" && openaiClient) {
    return {
      provider: "openai",
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    } as const;
  }

  if (configured === "huggingface" || (!configured && process.env.HUGGINGFACE_API_KEY)) {
    return {
      provider: "huggingface",
      model: process.env.HUGGINGFACE_IMAGE_MODEL || "stabilityai/stable-diffusion-xl-base-1.0",
    } as const;
  }

  if (openaiClient) {
    return {
      provider: "openai",
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    } as const;
  }

  if (process.env.HUGGINGFACE_API_KEY) {
    return {
      provider: "huggingface",
      model: process.env.HUGGINGFACE_IMAGE_MODEL || "stabilityai/stable-diffusion-xl-base-1.0",
    } as const;
  }

  throw new Error("No image generation provider is configured");
}

function normalizePrompt(prompt: string) {
  return prompt.replace(/\s+/g, " ").trim();
}

function validateInput(input: CreateImageInput) {
  const prompt = normalizePrompt(input.prompt);
  if (!prompt) throw new Error("Prompt is required");
  if (prompt.length < 6) throw new Error("Prompt is too short");
  if (prompt.length > 2000) throw new Error("Prompt is too long");

  const aspectRatio = (input.aspectRatio || "1:1").trim();
  const quality = (input.quality || "standard").trim().toLowerCase();
  const background = (input.background || "auto").trim().toLowerCase();
  const stylePreset = (input.stylePreset || "product").trim().toLowerCase();

  if (!["1:1", "16:9", "9:16"].includes(aspectRatio)) {
    throw new Error("Unsupported aspect ratio");
  }
  if (!["standard", "hd"].includes(quality)) {
    throw new Error("Unsupported quality");
  }
  if (!["auto", "opaque", "transparent"].includes(background)) {
    throw new Error("Unsupported background");
  }

  return {
    prompt,
    aspectRatio,
    quality,
    background,
    stylePreset,
  };
}

function toOpenAiSize(aspectRatio: string) {
  if (aspectRatio === "16:9") return { size: "1536x1024", width: 1536, height: 1024 };
  if (aspectRatio === "9:16") return { size: "1024x1536", width: 1024, height: 1536 };
  return { size: "1024x1024", width: 1024, height: 1024 };
}

function toHuggingFaceSize(aspectRatio: string) {
  if (aspectRatio === "16:9") return { width: 1344, height: 768 };
  if (aspectRatio === "9:16") return { width: 768, height: 1344 };
  return { width: 1024, height: 1024 };
}

function buildPrompt(prompt: string, stylePreset: string) {
  const style = STYLE_PRESETS[stylePreset] || STYLE_PRESETS.product;
  return `${style}, premium 3D render, commercially usable composition, clean background when appropriate, ${prompt}`;
}

async function generateWithOpenAI(input: {
  prompt: string;
  model: string;
  aspectRatio: string;
  quality: string;
  background: string;
}): Promise<ProviderResult> {
  if (!openaiClient) throw new Error("OPENAI_API_KEY is not configured");
  const size = toOpenAiSize(input.aspectRatio);
  const response = (await openaiClient.images.generate({
    model: input.model,
    prompt: input.prompt,
    size: size.size as "1024x1024" | "1536x1024" | "1024x1536",
    quality: input.quality as "standard" | "hd",
    background: input.background === "auto" ? undefined : (input.background as "opaque" | "transparent"),
  } as never)) as {
    data?: Array<{ b64_json?: string | null }>;
  };

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error("Image provider returned no image data");

  return {
    mimeType: "image/png",
    buffer: Buffer.from(b64, "base64"),
    width: size.width,
    height: size.height,
    seed: null,
  };
}

async function generateWithHuggingFace(input: {
  prompt: string;
  model: string;
  aspectRatio: string;
}): Promise<ProviderResult> {
  const apiKey = process.env.THREE_D_GENERATION_API_KEY || process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY is not configured");

  const size = toHuggingFaceSize(input.aspectRatio);
  const response = await fetch(`https://router.huggingface.co/hf-inference/models/${encodeURIComponent(input.model)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "image/png",
    },
    body: JSON.stringify({
      inputs: input.prompt,
      parameters: {
        width: size.width,
        height: size.height,
      },
      options: {
        wait_for_model: true,
        use_cache: false,
      },
    }),
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text().catch(() => "");
    let details = text;

    if (contentType.includes("application/json")) {
      try {
        const parsed = JSON.parse(text) as {
          error?: string;
          estimated_time?: number;
        };
        if (parsed.error) {
          details = parsed.error;
          if (parsed.estimated_time) {
            details += ` (estimated time ${Math.ceil(parsed.estimated_time)}s)`;
          }
        }
      } catch {
        // keep original text when the upstream body isn't valid JSON
      }
    }

    throw new Error(`Hugging Face image generation failed (${response.status}): ${details || "Unknown upstream error"}`);
  }

  return {
    mimeType: response.headers.get("content-type") || "image/png",
    buffer: Buffer.from(await response.arrayBuffer()),
    width: size.width,
    height: size.height,
    seed: null,
  };
}

function userFacingError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("rate limit")) return "Rate limit exceeded. Please wait before generating again.";
  if (message.includes("policy") || message.includes("moderation")) {
    return "This prompt was blocked by the image provider safety system.";
  }
  if (message.includes("no image generation provider")) {
    return "Image generation is not configured on the server.";
  }
  if (message.includes("401") || message.includes("unauthorized") || message.includes("invalid token")) {
    return "The configured image generation API key is invalid or expired.";
  }
  if (message.includes("402") || message.includes("quota") || message.includes("payment")) {
    return "The image generation provider account has exhausted its quota.";
  }
  if (message.includes("404") || message.includes("not found")) {
    return "The configured image model could not be found.";
  }
  if (message.includes("503") || message.includes("loading")) {
    return "The image model is still warming up. Please try again in a moment.";
  }
  if (message.includes("504") || message.includes("timeout")) {
    return "The image provider timed out while generating the image.";
  }
  return "Image generation failed. Please try again.";
}

export function toGeneratedImageDto(
  generation: {
    id: string;
    status: string;
    prompt: string;
    enhancedPrompt: string | null;
    stylePreset: string | null;
    aspectRatio: string;
    quality: string;
    background: string | null;
    provider: string;
    model: string;
    mimeType: string | null;
    width: number | null;
    height: number | null;
    errorMessage: string | null;
    createdAt: Date;
  }
) {
  return {
    id: generation.id,
    status: generation.status,
    prompt: generation.prompt,
    enhancedPrompt: generation.enhancedPrompt,
    stylePreset: generation.stylePreset,
    aspectRatio: generation.aspectRatio,
    quality: generation.quality,
    background: generation.background,
    provider: generation.provider,
    model: generation.model,
    mimeType: generation.mimeType,
    width: generation.width,
    height: generation.height,
    errorMessage: generation.errorMessage,
    imageUrl: generation.status === "succeeded" ? `/api/generated-images/${generation.id}` : null,
    createdAt: generation.createdAt.toISOString(),
  };
}

export async function listGeneratedImages(user: AppUser) {
  const items = await prisma.generatedImage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: Number(process.env.GENERATED_IMAGES_HISTORY_LIMIT || 24),
    select: {
      id: true,
      status: true,
      prompt: true,
      enhancedPrompt: true,
      stylePreset: true,
      aspectRatio: true,
      quality: true,
      background: true,
      provider: true,
      model: true,
      mimeType: true,
      width: true,
      height: true,
      errorMessage: true,
      createdAt: true,
    },
  });

  return items.map(toGeneratedImageDto);
}

export async function listGeneratedImagesFromStorage(clerkUserId: string) {
  return listGeneratedImageHistoryFromStorage(clerkUserId);
}

export function isDatabaseConnectivityError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("can't reach database server") ||
    message.includes("can not reach database server") ||
    message.includes("tenant or user not found") ||
    message.includes("authentication failed") ||
    message.includes("connection failure during authentication") ||
    message.includes("database is unreachable") ||
    message.includes("connection terminated")
  );
}

export async function createGeneratedImage(input: CreateImageInput) {
  const validated = validateInput(input);
  const config = getImageProvider();
  const rateLimit = await enforceRateLimit({
    routeKey: "generated-image:create",
    subjectKey: input.user.id,
    userId: input.user.id,
    limit: Number(process.env.GENERATED_IMAGES_PER_MINUTE || 6),
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    throw new Error("Rate limit exceeded");
  }

  const enhancedPrompt = buildPrompt(validated.prompt, validated.stylePreset);
  const generation = await prisma.generatedImage.create({
    data: {
      userId: input.user.id,
      status: "pending",
      prompt: validated.prompt,
      enhancedPrompt,
      stylePreset: validated.stylePreset,
      aspectRatio: validated.aspectRatio,
      quality: validated.quality,
      background: validated.background,
      provider: config.provider,
      model: config.model,
    },
    select: {
      id: true,
    },
  });

  try {
    const result =
      config.provider === "openai"
        ? await generateWithOpenAI({
            prompt: enhancedPrompt,
            model: config.model,
            aspectRatio: validated.aspectRatio,
            quality: validated.quality,
            background: validated.background,
          })
        : await generateWithHuggingFace({
            prompt: enhancedPrompt,
            model: config.model,
            aspectRatio: validated.aspectRatio,
          });

    const stored = await saveGeneratedImage({
      generationId: generation.id,
      userKey: input.user.clerkId,
      mimeType: result.mimeType,
      buffer: result.buffer,
    });

    await writeGeneratedImageManifest({
      storageProvider: stored.provider,
      imageKey: stored.key,
      manifest: {
        id: generation.id,
        prompt: validated.prompt,
        enhancedPrompt,
        stylePreset: validated.stylePreset,
        aspectRatio: validated.aspectRatio,
        quality: validated.quality,
        background: validated.background,
        provider: config.provider,
        model: config.model,
        mimeType: result.mimeType,
        width: result.width || null,
        height: result.height || null,
        createdAt: new Date().toISOString(),
        imageKey: stored.key,
      },
    });

    try {
      const saved = await prisma.generatedImage.update({
        where: { id: generation.id },
        data: {
          status: "succeeded",
          mimeType: result.mimeType,
          width: result.width,
          height: result.height,
          seed: result.seed || null,
          storageProvider: stored.provider,
          storageKey: stored.key,
          errorCode: null,
          errorMessage: null,
        },
        select: {
          id: true,
          status: true,
          prompt: true,
          enhancedPrompt: true,
          stylePreset: true,
          aspectRatio: true,
          quality: true,
          background: true,
          provider: true,
          model: true,
          mimeType: true,
          width: true,
          height: true,
          errorMessage: true,
          createdAt: true,
        },
      });

      return toGeneratedImageDto(saved);
    } catch (databaseError) {
      if (!isDatabaseConnectivityError(databaseError)) {
        throw databaseError;
      }

      console.warn("[generate-image] database update failed after image was stored", {
        generationId: generation.id,
        error: databaseError instanceof Error ? databaseError.message : databaseError,
      });

      return {
        id: generation.id,
        status: "succeeded",
        prompt: validated.prompt,
        enhancedPrompt,
        stylePreset: validated.stylePreset,
        aspectRatio: validated.aspectRatio,
        quality: validated.quality,
        background: validated.background,
        provider: config.provider,
        model: config.model,
        mimeType: result.mimeType,
        width: result.width || null,
        height: result.height || null,
        errorMessage: null,
        imageUrl: `/api/generated-images/${generation.id}`,
        createdAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    if (isDatabaseConnectivityError(error)) {
      throw error;
    }

    console.error("[generate-image] provider failure", {
      provider: config.provider,
      model: config.model,
      error: error instanceof Error ? error.message : error,
    });

    try {
      await prisma.generatedImage.update({
        where: { id: generation.id },
        data: {
          status: "failed",
          errorCode: "generation_failed",
          errorMessage: userFacingError(error),
        },
      });
    } catch (databaseError) {
      if (!isDatabaseConnectivityError(databaseError)) {
        throw databaseError;
      }

      console.warn("[generate-image] failed to persist provider error to database", {
        generationId: generation.id,
        error: databaseError instanceof Error ? databaseError.message : databaseError,
      });
    }

    throw new Error(userFacingError(error));
  }
}

export async function createGeneratedImageWithoutDatabase(input: Omit<CreateImageInput, "user"> & { clerkUserId: string }) {
  const validated = validateInput({
    user: {} as AppUser,
    prompt: input.prompt,
    stylePreset: input.stylePreset,
    aspectRatio: input.aspectRatio,
    quality: input.quality,
    background: input.background,
  });
  const config = getImageProvider();
  const generationId = `storage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const enhancedPrompt = buildPrompt(validated.prompt, validated.stylePreset);

  try {
    const result =
      config.provider === "openai"
        ? await generateWithOpenAI({
            prompt: enhancedPrompt,
            model: config.model,
            aspectRatio: validated.aspectRatio,
            quality: validated.quality,
            background: validated.background,
          })
        : await generateWithHuggingFace({
            prompt: enhancedPrompt,
            model: config.model,
            aspectRatio: validated.aspectRatio,
          });

    const stored = await saveGeneratedImage({
      generationId,
      userKey: input.clerkUserId,
      mimeType: result.mimeType,
      buffer: result.buffer,
    });

    await writeGeneratedImageManifest({
      storageProvider: stored.provider,
      imageKey: stored.key,
      manifest: {
        id: generationId,
        prompt: validated.prompt,
        enhancedPrompt,
        stylePreset: validated.stylePreset,
        aspectRatio: validated.aspectRatio,
        quality: validated.quality,
        background: validated.background,
        provider: config.provider,
        model: config.model,
        mimeType: result.mimeType,
        width: result.width || null,
        height: result.height || null,
        createdAt: new Date().toISOString(),
        imageKey: stored.key,
      },
    });

    const imageHistory = await listGeneratedImageHistoryFromStorage(input.clerkUserId);
    const created = imageHistory.find((item) => item.id === generationId);
    if (created) return created;

    return {
      id: generationId,
      status: "succeeded",
      prompt: validated.prompt,
      enhancedPrompt,
      stylePreset: validated.stylePreset,
      aspectRatio: validated.aspectRatio,
      quality: validated.quality,
      background: validated.background,
      provider: config.provider,
      model: config.model,
      mimeType: result.mimeType,
      width: result.width || null,
      height: result.height || null,
      errorMessage: null,
      imageUrl: null,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[generate-image] provider failure (storage fallback)", {
      provider: config.provider,
      model: config.model,
      error: error instanceof Error ? error.message : error,
    });
    throw new Error(userFacingError(error));
  }
}
