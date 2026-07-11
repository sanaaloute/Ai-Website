// ---- Schema helpers (static fragment, concatenated by the generator) ----
// These functions reference the module-level `COLLECTIONS` and `AUTH`
// constants that are generated above this fragment.

export function getCollection(name: string): CollectionMeta | undefined {
  return COLLECTIONS[name];
}

export function baseCollections(): CollectionMeta[] {
  return Object.values(COLLECTIONS).filter((c) => !c.auth);
}

export type AuthScope = "public" | "any" | "admin" | "owner";

/**
 * Translate a PocketBase-style access rule into a coarse authorization scope.
 * This is a pragmatic heuristic for generated templates; refine per project.
 */
export function authorize(
  rule: string | undefined,
  _payload: { role?: string } | null
): AuthScope {
  const r = (rule || "").trim();
  if (r === "") return "public";
  const adminOnly = r.includes('@request.auth.role = "admin"');
  const owner = r.includes("= @request.auth.id");
  const anyAuth = r.includes('@request.auth.id != ""');
  if (adminOnly && !owner && !anyAuth) return "admin";
  if (owner) return "owner";
  if (anyAuth) return "any";
  return "admin";
}

export function ownerField(
  name: string
): { field: string; fk: string } | null {
  const meta = COLLECTIONS[name];
  if (!meta) return null;
  const f = meta.fields.find(
    (f) => f.type === "relation" && f.relationTarget === AUTH.collection
  );
  if (!f) return null;
  return { field: f.name, fk: f.fk || f.name + "Id" };
}

export function coerceInput(
  name: string,
  body: Record<string, unknown>,
  opts: { partial?: boolean } = {}
): Record<string, unknown> {
  const meta = COLLECTIONS[name];
  if (!meta) return {};
  const out: Record<string, unknown> = {};
  for (const f of meta.fields) {
    if (f.name === "id" || f.name === "created" || f.name === "updated") continue;
    if (f.type === "relation") {
      const fk = f.fk || f.name + "Id";
      let v: unknown = body[fk] ?? body[f.name];
      if (v === "" || v === undefined) v = null;
      if (v !== null || !opts.partial) out[fk] = v === null ? null : String(v);
      continue;
    }
    let v: unknown = body[f.name];
    if (v === undefined && opts.partial) continue;
    if (v === "" || v === undefined) v = null;
    switch (f.type) {
      case "number":
        out[f.name] = v === null ? null : Number(v);
        break;
      case "bool":
        out[f.name] = v === null ? null : Boolean(v);
        break;
      case "date":
        out[f.name] = v === null ? null : new Date(String(v));
        break;
      case "json":
        out[f.name] = v === null ? null : typeof v === "string" ? v : JSON.stringify(v);
        break;
      case "file":
        out[f.name] = v === null ? null : Array.isArray(v) ? JSON.stringify(v) : String(v);
        break;
      default:
        out[f.name] = v === null ? null : String(v);
    }
  }
  return out;
}
