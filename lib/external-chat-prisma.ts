import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const rawConnectionString = process.env.DATABASE_URL || "";

if (!rawConnectionString) {
  console.error("[External Chat] No database URL found. Please set DATABASE_URL.");
}

export function normalizeExternalChatConnectionString(input: string | undefined) {
  if (!input) return "";
  
  let value = input.trim();

  if (value.startsWith("DATABASE_URL=")) {
    value = value.slice("DATABASE_URL=".length);
  }

  value = value.replace(/^["']|["']$/g, "");

  const protoIndex = value.search(/postgres(?:ql)?:\/\//i);
  if (protoIndex > 0) {
    value = value.slice(protoIndex);
  }

  try {
    const url = new URL(value);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("sslcert");
    url.searchParams.delete("sslkey");
    url.searchParams.delete("sslrootcert");
    
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "30");
    }
    
    // Add statement timeout to prevent long-running queries
    if (!url.searchParams.has("statement_timeout")) {
      url.searchParams.set("statement_timeout", "30000");
    }
    
    return url.toString();
  } catch (error) {
    console.error("[External Chat] Failed to parse connection string:", error);
    const stripped = value
      .replace(/([?&])(sslmode|sslcert|sslkey|sslrootcert)=[^&]*/gi, "$1")
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");
    return stripped;
  }
}

export function resolveExternalChatSslConfig(forceSslEnabled: boolean) {
  if (!forceSslEnabled) return undefined;

  const certCandidates = [
    process.env.CHAT_DATABASE_SSL_ROOT_CERT,
    process.env.PGSSLROOTCERT,
    path.join(process.cwd(), "certs", "root.crt"),
    path.join(process.cwd(), "cert", "root.crt"),
  ].filter((candidate): candidate is string => Boolean(candidate && candidate.trim()));

  for (const candidate of certCandidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      return {
        rejectUnauthorized: true,
        ca: fs.readFileSync(candidate, "utf8"),
      };
    } catch {
      // Ignore bad cert reads
    }
  }

  return { rejectUnauthorized: false };
}

export const normalizedExternalChatConnectionString = rawConnectionString ? normalizeExternalChatConnectionString(rawConnectionString) : "";

const isLocalhost = normalizedExternalChatConnectionString.includes("localhost") || normalizedExternalChatConnectionString.includes("127.0.0.1");

const forceSsl =
  (process.env.NODE_ENV === "production" && !isLocalhost) ||
  (rawConnectionString && /sslmode=/i.test(rawConnectionString)) ||
  process.env.PGSSLMODE === "require";

export const externalChatForceSsl = forceSsl;

const globalForPrisma = globalThis as unknown as {
  externalChatPrisma?: PrismaClient;
  externalChatPool?: Pool;
  externalChatPoolKey?: string;
};

const poolKey = JSON.stringify({
  connectionString: normalizedExternalChatConnectionString,
  forceSsl,
  cert: process.env.CHAT_DATABASE_SSL_ROOT_CERT || process.env.PGSSLROOTCERT || "",
});

if (globalForPrisma.externalChatPool && globalForPrisma.externalChatPoolKey !== poolKey) {
  try {
    globalForPrisma.externalChatPool.end().catch(() => undefined);
  } catch {
    // ignore
  }
  globalForPrisma.externalChatPool = undefined;
  globalForPrisma.externalChatPrisma = undefined;
}

let pool: Pool;
let adapter: PrismaPg | undefined;
let prismaClient: PrismaClient;

function makeCompatibilityModel(client: any, unifiedModelName: string, legacyModelName: string) {
  const unifiedModel = client[unifiedModelName];
  if (!unifiedModel) return undefined;

  function translateWhere(where: any) {
    if (!where) return where;
    const newWhere = { ...where };
    if (newWhere.roomId_userId && legacyModelName === 'externalChatRoomMember') {
      const compound = newWhere.roomId_userId;
      newWhere.roomId = compound.roomId;
      newWhere.userId = compound.userId;
      delete newWhere.roomId_userId;
    }
    return newWhere;
  }

  function translateInclude(include: any) {
    return include;
  }

  function translateResult(result: any): any {
    if (!result) return result;
    if (Array.isArray(result)) return result.map(translateResult);
    
    const newResult = { ...result };
    if (legacyModelName === 'externalChatRoom') {
      if (newResult.createdById !== undefined) {
        newResult.createdBy = newResult.createdById;
      }
    }
    return newResult;
  }

  return {
    findUnique(args: any) {
      const newArgs = { ...args };
      newArgs.where = translateWhere(args.where);
      newArgs.include = translateInclude(args.include);
      return unifiedModel.findUnique(newArgs).then(translateResult);
    },
    findFirst(args: any) {
      const newArgs = { ...args };
      newArgs.where = translateWhere(args.where);
      newArgs.include = translateInclude(args.include);
      return unifiedModel.findFirst(newArgs).then(translateResult);
    },
    findMany(args: any) {
      const newArgs = { ...args };
      newArgs.where = translateWhere(args.where);
      newArgs.include = translateInclude(args.include);
      return unifiedModel.findMany(newArgs).then(translateResult);
    },
    create(args: any) {
      const newArgs = { ...args };
      if (args.data) {
        newArgs.data = { ...args.data };
        if (legacyModelName === 'externalChatRoom') {
          if (args.data.createdBy) {
            newArgs.data.createdById = args.data.createdBy;
            delete newArgs.data.createdBy;
          }
          newArgs.data.type = args.data.type || 'group';
        }
      }
      return unifiedModel.create(newArgs).then(translateResult);
    },
    update(args: any) {
      const newArgs = { ...args };
      newArgs.where = translateWhere(args.where);
      if (newArgs.data && legacyModelName === 'externalChatRoom') {
        newArgs.data = { ...newArgs.data };
        if (newArgs.data.createdBy) {
          newArgs.data.createdById = newArgs.data.createdBy;
          delete newArgs.data.createdBy;
        }
      }
      return unifiedModel.update(newArgs).then(translateResult);
    },
    updateMany(args: any) {
      const newArgs = { ...args };
      newArgs.where = translateWhere(args.where);
      return unifiedModel.updateMany(newArgs).then(translateResult);
    },
    delete(args: any) {
      const newArgs = { ...args };
      newArgs.where = translateWhere(args.where);
      return unifiedModel.delete(newArgs).then(translateResult);
    },
    deleteMany(args: any) {
      const newArgs = { ...args };
      newArgs.where = translateWhere(args.where);
      return unifiedModel.deleteMany(newArgs).then(translateResult);
    },
    count(args: any) {
      const newArgs = { ...args };
      newArgs.where = translateWhere(args.where);
      return unifiedModel.count(newArgs);
    },
    upsert(args: any) {
      const newArgs = { ...args };
      newArgs.where = translateWhere(args.where);
      if (args.create) {
        newArgs.create = { ...args.create };
        if (legacyModelName === 'externalChatRoom') {
          if (args.create.createdBy) {
            newArgs.create.createdById = args.create.createdBy;
            delete newArgs.create.createdBy;
          }
        }
      }
      if (args.update) {
        newArgs.update = { ...args.update };
        if (legacyModelName === 'externalChatRoom') {
          if (args.update.createdBy) {
            newArgs.update.createdById = args.update.createdBy;
            delete newArgs.update.createdBy;
          }
        }
      }
      if (legacyModelName === 'externalChatRoomMember') {
        return unifiedModel.findFirst({ where: newArgs.where }).then((existing: any) => {
          if (existing) {
            return unifiedModel.update({
              where: { id: existing.id },
              data: newArgs.update
            });
          } else {
            return unifiedModel.create({
              data: newArgs.create
            });
          }
        }).then(translateResult);
      }
      return unifiedModel.upsert(newArgs).then(translateResult);
    }
  };
}

if (normalizedExternalChatConnectionString) {
  try {
    pool =
      globalForPrisma.externalChatPool ??
      new Pool({
        connectionString: normalizedExternalChatConnectionString,
        max: 8,
        min: 2,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 10000,
        allowExitOnIdle: true,
        ssl: resolveExternalChatSslConfig(forceSsl),
      });

    adapter = new PrismaPg(pool);

    prismaClient =
      globalForPrisma.externalChatPrisma ??
      new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });
  } catch (error) {
    console.error("[External Chat] Failed to create database connection:", error);
    prismaClient = new PrismaClient();
    pool = new Pool({ max: 1 });
    adapter = undefined;
  }
} else {
  console.warn("[External Chat] No database connection string found. External chat features will be unavailable.");
  prismaClient = new PrismaClient();
  pool = new Pool({ max: 1 });
  adapter = undefined;
}

const externalChatPrismaInstance = prismaClient as any;
externalChatPrismaInstance.externalChatRoom = makeCompatibilityModel(externalChatPrismaInstance, 'conversation', 'externalChatRoom');
externalChatPrismaInstance.externalChatRoomMember = makeCompatibilityModel(externalChatPrismaInstance, 'conversationMember', 'externalChatRoomMember');
externalChatPrismaInstance.externalChatMessage = makeCompatibilityModel(externalChatPrismaInstance, 'conversationMessage', 'externalChatMessage');

export const externalChatPrisma = prismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.externalChatPool = pool;
  globalForPrisma.externalChatPoolKey = poolKey;
  globalForPrisma.externalChatPrisma = prismaClient;
}