import { NextRequest, NextResponse } from "next/server";
import { dataSource } from "@/lib/data-source";
import { getPayload, isAdmin } from "@/lib/api-auth";
import {
  getCollection,
  authorize,
  coerceInput,
  ownerField,
} from "@/lib/schema";

type Ctx = { params: Promise<{ collection: string }> };

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const { collection } = await ctx.params;
  const meta = getCollection(collection);
  if (!meta || meta.auth) return notFound();

  const payload = await getPayload(request);
  const scope = authorize(meta.rules.list, payload);
  const where: Record<string, unknown> = {};

  if (scope === "any" && !payload) return unauthorized();
  if (scope === "admin" && !isAdmin(payload)) return forbidden();
  if (scope === "owner" && !isAdmin(payload)) {
    if (!payload) return unauthorized();
    const of = ownerField(collection);
    if (of) where[of.fk] = payload.userId;
  }

  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort");
  const orderBy: Record<string, "asc" | "desc"> | undefined = sort
    ? { [sort.replace(/^-/, "")]: sort.startsWith("-") ? "desc" : "asc" }
    : undefined;
  const take = Math.min(Number(searchParams.get("limit") || 50), 200);
  const skip = Number(searchParams.get("offset") || 0);

  try {
    const [items, total] = await Promise.all([
      dataSource.list(collection, { where, orderBy, take, skip }),
      dataSource.count(collection, where),
    ]);
    return NextResponse.json({ items, total });
  } catch (error) {
    console.error("List error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { collection } = await ctx.params;
  const meta = getCollection(collection);
  if (!meta || meta.auth) return notFound();

  const payload = await getPayload(request);
  const scope = authorize(meta.rules.create, payload);

  if (scope === "admin" && !isAdmin(payload)) return forbidden();
  if ((scope === "any" || scope === "owner") && !payload) return unauthorized();

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  if (scope === "owner" && !isAdmin(payload)) {
    const of = ownerField(collection);
    if (of && payload) body[of.fk] = payload.userId;
  }

  try {
    const data = coerceInput(collection, body);
    const created = await dataSource.create(collection, data);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Create error:", error);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
