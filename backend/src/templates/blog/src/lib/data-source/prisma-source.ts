import { prisma } from "@/lib/prisma";
import { getCollection, AUTH } from "@/lib/schema";
import type { DataSource, ListOptions, Where, UserRecord } from "./types";

type AnyDelegate = {
  findMany: (args?: unknown) => Promise<unknown[]>;
  findUnique: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
  count: (args?: unknown) => Promise<number>;
};

function delegate(collection: string): AnyDelegate {
  const meta = getCollection(collection);
  if (!meta) throw new Error(`Unknown collection: ${collection}`);
  const d = (prisma as unknown as Record<string, AnyDelegate>)[meta.accessor];
  if (!d) throw new Error(`Prisma delegate not found for: ${collection}`);
  return d;
}

function users(): AnyDelegate {
  const d = (prisma as unknown as Record<string, AnyDelegate>)[AUTH.accessor];
  if (!d) throw new Error("Auth delegate not found");
  return d;
}

export class PrismaDataSource implements DataSource {
  async getUserByEmail(email: string): Promise<UserRecord | null> {
    return (await users().findUnique({ where: { email } })) as UserRecord | null;
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    return (await users().findUnique({ where: { id } })) as UserRecord | null;
  }

  async createUser(data: {
    email: string;
    password: string;
    name?: string | null;
    role?: string;
  }): Promise<UserRecord> {
    return (await users().create({
      data: { role: "customer", ...data },
    })) as UserRecord;
  }

  async list(collection: string, opts: ListOptions = {}) {
    const { where, orderBy, take, skip } = opts;
    return (await delegate(collection).findMany({
      where,
      orderBy,
      take,
      skip,
    })) as Record<string, unknown>[];
  }

  async get(collection: string, id: string) {
    return (await delegate(collection).findUnique({
      where: { id },
    })) as Record<string, unknown> | null;
  }

  async create(collection: string, data: Record<string, unknown>) {
    return (await delegate(collection).create({ data })) as Record<string, unknown>;
  }

  async update(collection: string, id: string, data: Record<string, unknown>) {
    return (await delegate(collection).update({
      where: { id },
      data,
    })) as Record<string, unknown>;
  }

  async remove(collection: string, id: string): Promise<void> {
    await delegate(collection).delete({ where: { id } });
  }

  async count(collection: string, where?: Where): Promise<number> {
    return delegate(collection).count({ where });
  }
}
