import OpenAI from "openai";
import { Prisma } from "@prisma/client";
import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { AppUser } from "@/services/user.service";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese (Simplified)" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "it", label: "Italian" },
] as const;

const LANG_LABEL_BY_CODE = new Map<string, string>(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l.label])
);

const OFFLINE_PHRASEBOOK: Record<string, Record<string, string>> = {
  hello: { es: "hola", fr: "bonjour", de: "hallo", hi: "नमस्ते", pt: "olá", it: "ciao", ja: "こんにちは" },
  "how are you": { es: "¿cómo estás?", fr: "comment ça va ?", de: "wie geht es dir?", hi: "आप कैसे हैं?", pt: "como você está?" },
  "thank you": { es: "gracias", fr: "merci", de: "danke", hi: "धन्यवाद", pt: "obrigado", it: "grazie", ja: "ありがとう" },
  "good morning": { es: "buenos días", fr: "bonjour", de: "guten morgen", hi: "सुप्रभात", pt: "bom dia", it: "buongiorno" },
  yes: { es: "sí", fr: "oui", de: "ja", hi: "हाँ", pt: "sim", it: "sì" },
  no: { es: "no", fr: "non", de: "nein", hi: "नहीं", pt: "não", it: "no" },
};

async function translateViaOpenAI(text: string, targetLanguage: string): Promise<{ translatedText: string; detectedSourceLanguage: string; provider: string } | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const targetLabel = LANG_LABEL_BY_CODE.get(targetLanguage) || targetLanguage;
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a precise translator. Translate the user text into the requested target language. Return valid JSON with keys: translatedText (string) and detectedSourceLanguage (ISO 639-1 code string).",
      },
      {
        role: "user",
        content: `Target language: ${targetLabel} (${targetLanguage})\nText: ${text}`,
      },
    ],
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) return null;
  const parsed = JSON.parse(raw) as { translatedText?: string; detectedSourceLanguage?: string };
  if (!parsed.translatedText) return null;
  return {
    translatedText: parsed.translatedText,
    detectedSourceLanguage: (parsed.detectedSourceLanguage || "auto").toLowerCase(),
    provider: "openai",
  };
}

async function translateViaGooglePublic(text: string, targetLanguage: string): Promise<{ translatedText: string; detectedSourceLanguage: string; provider: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLanguage)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as [Array<[string, string]>, unknown, string];
    const segments = Array.isArray(data?.[0]) ? data[0] : [];
    const translatedText = segments.map((seg) => seg?.[0] || "").join("").trim();
    if (!translatedText) return null;
    return {
      translatedText,
      detectedSourceLanguage: typeof data?.[2] === "string" ? data[2] : "auto",
      provider: "google-translate",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function translateViaMyMemory(text: string, targetLanguage: string, sourceLanguage = "en"): Promise<{ translatedText: string; detectedSourceLanguage: string; provider: string } | null> {
  if (sourceLanguage === targetLanguage) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const langpair = `${sourceLanguage}|${targetLanguage}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { responseData?: { translatedText?: string } };
    const translatedText = data?.responseData?.translatedText?.trim();
    if (!translatedText) return null;
    return {
      translatedText,
      detectedSourceLanguage: sourceLanguage,
      provider: "mymemory",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function translateMessageContent(input: {
  actor: AppUser;
  text?: string;
  messageId?: string;
  targetLanguage: string;
}) {
  const targetLanguage = input.targetLanguage.trim().toLowerCase();
  if (!LANG_LABEL_BY_CODE.has(targetLanguage)) {
    throw new Error("Unsupported target language");
  }

  let sourceText = input.text?.trim() || "";
  let messageRecord: { id: string; content: string; metadata: Prisma.JsonValue | null } | null = null;

  if (input.messageId?.trim()) {
    const msg = await prisma.externalChatMessage.findUnique({
      where: { id: input.messageId.trim() },
      include: {
        room: {
          include: {
            members: {
              where: { userId: input.actor.id },
              select: { id: true },
            },
          },
        },
      },
    });
    if (!msg || msg.deletedAt) throw new Error("Message not found");
    if (msg.room.members.length === 0 && input.actor.role.toLowerCase() !== "admin") {
      throw new Error("Not allowed");
    }

    const meta = (msg.metadata && typeof msg.metadata === "object" && !Array.isArray(msg.metadata)
      ? msg.metadata
      : {}) as Record<string, unknown>;

    // Return cached server translation when message is non-E2EE and already translated
    const cachedTranslations = (meta.translations && typeof meta.translations === "object"
      ? meta.translations
      : {}) as Record<string, { translatedText: string; detectedSourceLanguage: string; provider: string }>;
    if (!meta.e2ee && cachedTranslations[targetLanguage]?.translatedText) {
      return {
        ...cachedTranslations[targetLanguage],
        targetLanguage,
        cached: true,
      };
    }

    messageRecord = { id: msg.id, content: msg.content, metadata: msg.metadata };
    if (!sourceText && !meta.e2ee) {
      sourceText = msg.content.trim();
    }
  }

  if (!sourceText) {
    throw new Error("Text to translate is required");
  }
  if (sourceText.length > 4000) {
    throw new Error("Text is too long to translate");
  }

  const fromOpenAI = await translateViaOpenAI(sourceText, targetLanguage).catch(() => null);
  const fromGoogle = fromOpenAI ? null : await translateViaGooglePublic(sourceText, targetLanguage);
  const fromMyMemory =
    fromOpenAI || fromGoogle ? null : await translateViaMyMemory(sourceText, targetLanguage);

  let result = fromOpenAI || fromGoogle || fromMyMemory;
  if (!result) {
    const phraseMatch = OFFLINE_PHRASEBOOK[sourceText.toLowerCase()]?.[targetLanguage];
    if (phraseMatch) {
      result = {
        translatedText: phraseMatch,
        detectedSourceLanguage: "en",
        provider: "phrasebook-fallback",
      };
    } else {
      throw new Error("Translation provider is currently unavailable");
    }
  }

  // Persist non-E2EE cached translation on message metadata
  if (messageRecord) {
    const existingMeta = (messageRecord.metadata && typeof messageRecord.metadata === "object" && !Array.isArray(messageRecord.metadata)
      ? messageRecord.metadata
      : {}) as Record<string, unknown>;
    if (!existingMeta.e2ee) {
      const prevTranslations = (existingMeta.translations && typeof existingMeta.translations === "object"
        ? existingMeta.translations
        : {}) as Record<string, unknown>;
      await prisma.externalChatMessage.update({
        where: { id: messageRecord.id },
        data: {
          metadata: {
            ...existingMeta,
            translations: {
              ...prevTranslations,
              [targetLanguage]: result,
            },
          } as Prisma.InputJsonValue,
        },
      }).catch(() => undefined);
    }
  }

  return {
    ...result,
    targetLanguage,
    cached: false,
  };
}

