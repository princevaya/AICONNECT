import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

function normalizeConnectionString(input: string) {
  let value = input.trim();

  if (value.startsWith("DATABASE_URL=")) {
    value = value.slice("DATABASE_URL=".length);
  }

  value = value.replace(/^["']|["']$/g, "");

  try {
    const url = new URL(value);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("sslcert");
    url.searchParams.delete("sslkey");
    url.searchParams.delete("sslrootcert");
    return url.toString();
  } catch {
    return value
      .replace(/([?&])(sslmode|sslcert|sslkey|sslrootcert)=[^&]*/gi, "$1")
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");
  }
}

const rawConnectionString = process.env.DATABASE_URL || "";

if (!rawConnectionString) {
  throw new Error("DATABASE_URL must be set.");
}

const connectionString = normalizeConnectionString(rawConnectionString);
const isLocalhost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
const forceSsl =
  (process.env.NODE_ENV === "production" && !isLocalhost) ||
  /sslmode=require/i.test(rawConnectionString) ||
  process.env.PGSSLMODE === "require";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
  prismaPoolKey?: string;
};

const poolKey = JSON.stringify({
  connectionString,
  forceSsl,
});

if (globalForPrisma.prismaPool && globalForPrisma.prismaPoolKey !== poolKey) {
  void globalForPrisma.prismaPool.end().catch(() => undefined);
  globalForPrisma.prismaPool = undefined;
  globalForPrisma.prisma = undefined;
}

const pool =
  globalForPrisma.prismaPool ??
  new Pool({
    connectionString,
    max: 10,
    ssl: forceSsl ? { rejectUnauthorized: false } : undefined,
  });

const adapter = new PrismaPg(pool);

function makeCompatibilityModel(client: any, unifiedModelName: string, legacyModelName: string) {
  const unifiedModel = client[unifiedModelName];
  if (!unifiedModel) return undefined;

  function translateWhere(where: any) {
    if (!where) return where;
    const newWhere = { ...where };
    if (newWhere.roomId_userId && legacyModelName === 'participant') {
      const compound = newWhere.roomId_userId;
      newWhere.roomId = compound.roomId;
      newWhere.userId = compound.userId;
      delete newWhere.roomId_userId;
    }
    return newWhere;
  }

  function translateInclude(include: any) {
    if (!include) return include;
    const newInclude = { ...include };
    if (newInclude.participants && legacyModelName === 'chatRoom') {
      newInclude.members = newInclude.participants;
      delete newInclude.participants;
    }
    return newInclude;
  }

  function translateResult(result: any): any {
    if (!result) return result;
    if (Array.isArray(result)) return result.map(translateResult);
    
    const newResult = { ...result };
    if (legacyModelName === 'chatRoom') {
      if (newResult.name !== undefined) {
        newResult.title = newResult.name;
      }
      if (newResult.members !== undefined) {
        newResult.participants = newResult.members.map((m: any) => ({
          ...m,
          role: m.role
        }));
        delete newResult.members;
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
        if (legacyModelName === 'chatRoom') {
          newArgs.data.name = args.data.title;
          newArgs.data.type = 'internal';
          delete newArgs.data.title;
        }
      }
      return unifiedModel.create(newArgs).then(translateResult);
    },
    update(args: any) {
      const newArgs = { ...args };
      newArgs.where = translateWhere(args.where);
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
        if (legacyModelName === 'chatRoom') {
          newArgs.create.name = args.create.title;
          newArgs.create.type = 'internal';
          delete newArgs.create.title;
        }
      }
      if (args.update) {
        newArgs.update = { ...args.update };
        if (legacyModelName === 'chatRoom') {
          newArgs.update.name = args.update.title;
          delete newArgs.update.title;
        }
      }
      if (legacyModelName === 'participant') {
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

const rawPrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Apply compatibility layer properties
const prismaInstance = rawPrisma as any;
prismaInstance.chatRoom = makeCompatibilityModel(prismaInstance, 'conversation', 'chatRoom');
prismaInstance.participant = makeCompatibilityModel(prismaInstance, 'conversationMember', 'participant');
prismaInstance.chatMessage = makeCompatibilityModel(prismaInstance, 'conversationMessage', 'chatMessage');

export const prisma = rawPrisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaPool = pool;
  globalForPrisma.prismaPoolKey = poolKey;
  globalForPrisma.prisma = prisma;
}
