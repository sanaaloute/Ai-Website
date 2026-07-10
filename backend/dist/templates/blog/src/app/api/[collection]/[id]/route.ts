import { NextRequest, NextResponse } from "next/server";
import { dataSource } from "@/lib/data-source";
import { getPayload, isAdmin } from "@/lib/api-auth";
import {
  getCollection,
  authorize,
  coerceInput,
  ownerField,
} from "@/lib/schema";

type Ctx = { params: Promise<{ collection: string; id: string }> };

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

async function canAccess(
  collection: string,
  rule: string | undefined,
  payload: Awaited<ReturnType<typeof getPayload>>,
  record: Record<string, unknown> | null
): Promise<boolean> {
  const scope = authorize(rule, payload);
  if (scope === "public") return true;
  if (scope === "admin") return isAdmin(payload);
  if (scope === "any") return !!payload;
  // owner
  if (isAdmin(payload)) return true;
  if (!payload || !record) return false;
  const of = ownerField(collection);
  if (!of) return false;
  return record[of.fk] === payload.userId;
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const { collection, id } = await ctx.params;
  const meta = getCollection(collection);
  if (!meta || meta.auth) return notFound();

  const payload = await getPayload(request);
  const record = await dataSource.get(collection, id);
  if (!record) return notFound();

  if (!(await canAccess(collection, meta.rules.view, payload, record))) {
    return forbidden();
  }
  return NextResponse.json(record);
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { collection, id } = await ctx.params;
  const meta = getCollection(collection);
  if (!meta || meta.auth) return notFound();

  const payload = await getPayload(request);
  const existing = await dataSource.get(collection, id);
  if (!existing) return notFound();

  if (!(await canAccess(collection, meta.rules.update, payload, existing))) {
    return forbidden();
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  try {
    const data = coerceInput(collection, body, { partial: true });
    const updated = await dataSource.update(collection, id, data);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const { collection, id } = await ctx.params;
  const meta = getCollection(collection);
  if (!meta || meta.auth) return notFound();

  const payload = await getPayload(request);
  const existing = await dataSource.get(collection, id);
  if (!existing) return notFound();

  if (!(await canAccess(collection, meta.rules.delete, payload, existing))) {
    return forbidden();
  }

  try {
    await dataSource.remove(collection, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
