#!/usr/bin/env node
/**
 * synth-next-template.mjs
 *
 * Converts a consolidated category template (Vite + PocketBase layout with a
 * db_schema.json) into a generic Next.js + Prisma (libSQL/SQLite) template by
 * overlaying the shared scaffold at src/templates/_next-scaffold and deriving
 * the Prisma schema, seed and schema-metadata from db_schema.json.
 *
 * Usage:
 *   node backend/scripts/synth-next-template.mjs --all
 *   node backend/scripts/synth-next-template.mjs ecommerce travel
 *   node backend/scripts/synth-next-template.mjs ecommerce --keep-vite --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(__dirname, "..");
const TEMPLATES = path.join(BACKEND, "src", "templates");
const SCAFFOLD = path.join(TEMPLATES, "_next-scaffold");

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const KEEP_VITE = args.includes("--keep-vite");
const ALL = args.includes("--all");
const targets = args.filter((a) => !a.startsWith("--"));

// ---------- name helpers ----------
function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function singularize(seg) {
  if (/ies$/i.test(seg)) return seg.slice(0, -3) + "y";
  if (/(ses|xes|zes|ches|shes)$/i.test(seg)) return seg.slice(0, -2);
  if (/[^s]s$/i.test(seg) && !/ss$/i.test(seg)) return seg.slice(0, -1);
  return seg;
}
function modelName(collection) {
  const parts = collection.split("_");
  parts[parts.length - 1] = singularize(parts[parts.length - 1]);
  return parts.map(cap).join("");
}
function accessorName(model) {
  return model.charAt(0).toLowerCase() + model.slice(1);
}
function labelName(collection) {
  return collection.split("_").map(cap).join(" ");
}

// ---------- prisma field mapping ----------
const UNIQUE_OK = new Set(["text", "email", "url", "select"]);

function scalarPrisma(f) {
  const opt = f.required ? "" : "?";
  const unique =
    f.unique && UNIQUE_OK.has(f.type) ? " @unique" : "";
  let t;
  switch (f.type) {
    case "number":
      t = f.options?.noDecimal ? "Int" : "Float";
      break;
    case "bool":
      t = "Boolean";
      break;
    case "date":
      t = "DateTime";
      break;
    case "text":
    case "editor":
    case "url":
    case "email":
    case "select":
    case "file":
    case "json":
    default:
      t = "String";
  }
  return `${f.name} ${t}${opt}${unique}`;
}

// ---------- main derivation ----------
function build(collections) {
  // Ensure an auth collection exists so the auth stack always works.
  let auth = collections.find((c) => c.type === "auth");
  if (!auth) {
    auth = {
      id: "users",
      name: "users",
      type: "auth",
      system: true,
      schema: [
        { name: "name", type: "text", required: false },
        { name: "role", type: "select", required: false, options: { values: ["customer", "admin"] } },
      ],
    };
    collections = [...collections, auth];
  }

  // Index to resolve relation targets by (singular) field name.
  const idx = {};
  for (const c of collections) {
    idx[singularize(c.name)] = c.name;
    idx[c.name] = c.name;
  }

  const reverse = {}; // targetCollection -> [relation lines]
  const metas = [];

  for (const c of collections) {
    const isAuth = c.type === "auth";
    const model = isAuth ? "User" : modelName(c.name);
    const accessor = isAuth ? "user" : accessorName(model);
    const label = isAuth ? "Users" : labelName(c.name);

    const fields = [];
    const prismaLines = [];

    // id always present
    prismaLines.push("  id String @id @default(cuid())");

    if (isAuth) {
      prismaLines.push("  email String @unique");
      prismaLines.push("  password String");
      fields.push({ name: "email", type: "email", required: true, unique: true });
      fields.push({ name: "password", type: "text", required: true });
    }

    const schema = Array.isArray(c.schema) ? c.schema : [];
    const seen = new Set(isAuth ? ["email", "password"] : []);
    for (const f of schema) {
      if (!f || !f.name || seen.has(f.name)) continue;
      seen.add(f.name);
      if (f.type === "relation") {
        const target = idx[singularize(f.name)] || idx[f.name] || null;
        const fk = `${f.name}Id`;
        if (target) {
          const targetModel = target === auth.name ? "User" : modelName(target);
          const relName = `Rel_${c.name}_${f.name}`;
          const opt = f.required ? "" : "?";
          prismaLines.push(`  ${fk} String${opt}`);
          prismaLines.push(
            `  ${f.name} ${targetModel}${opt} @relation("${relName}", fields: [${fk}], references: [id])`
          );
          const revName = `${c.name}_${f.name}`;
          (reverse[target] ||= []).push(
            `  ${revName} ${model}[] @relation("${relName}")`
          );
          fields.push({
            name: f.name,
            type: "relation",
            required: !!f.required,
            fk,
            relationTarget: target,
          });
        } else {
          // unresolved relation -> store the id as a plain string
          prismaLines.push(`  ${scalarPrisma({ ...f, type: "text" })}`);
          fields.push({
            name: f.name,
            type: "text",
            required: !!f.required,
          });
        }
        continue;
      }
      prismaLines.push(`  ${scalarPrisma(f)}`);
      const def = {
        name: f.name,
        type: f.type,
        required: !!f.required,
      };
      if (f.unique) def.unique = true;
      if (f.type === "select" && Array.isArray(f.options?.values)) {
        def.options = { values: f.options.values };
      }
      fields.push(def);
    }

    // Auth model: guarantee a `role` (for admin gating) and `name`.
    if (isAuth) {
      if (!seen.has("role")) {
        prismaLines.push('  role String @default("customer")');
        fields.push({ name: "role", type: "select", required: false, options: { values: ["customer", "admin"] } });
        seen.add("role");
      }
      if (!seen.has("name")) {
        prismaLines.push("  name String?");
        fields.push({ name: "name", type: "text", required: false });
        seen.add("name");
      }
    }

    const presentable = isAuth
      ? "email"
      : (schema.find((x) => x.presentable) || {}).name ||
        (fields.find((x) => x.type === "text") || {}).name ||
        "id";

    metas.push({
      name: c.name,
      model,
      accessor,
      label,
      auth: isAuth,
      presentable,
      rules: {
        list: c.listRule || "",
        view: c.viewRule || "",
        create: c.createRule || "",
        update: c.updateRule || "",
        delete: c.deleteRule || "",
      },
      fields,
      prismaLines,
      reverseLines: [],
    });
  }

  // Second pass: attach reverse (opposite) relation fields now that every
  // forward relation has been collected into the `reverse` map.
  for (const m of metas) {
    m.reverseLines = reverse[m.name] || [];
  }

  return { metas, authName: auth.name };
}

function emitPrisma(metas) {
  const out = [];
  out.push("// Generated by synth-next-template.mjs from db_schema.json");
  out.push("// Do not edit by hand; re-run the generator to refresh.");
  out.push("");
  out.push("generator client {");
  out.push('  provider = "prisma-client-js"');
  out.push("}");
  out.push("");
  out.push("datasource db {");
  out.push('  provider = "sqlite"');
  out.push('  url      = env("DATABASE_URL")');
  out.push("}");
  for (const m of metas) {
    out.push("");
    out.push(`model ${m.model} {`);
    for (const line of m.prismaLines) out.push(line);
    for (const line of m.reverseLines) out.push(line);
    out.push("  created DateTime @default(now())");
    out.push("  updated DateTime @updatedAt");
    out.push(`  @@map("${m.name}")`);
    out.push("}");
  }
  return out.join("\n") + "\n";
}

function emitSchemaTs(metas, authName) {
  const data = {};
  for (const m of metas) {
    data[m.name] = {
      name: m.name,
      model: m.model,
      accessor: m.accessor,
      label: m.label,
      auth: m.auth,
      presentable: m.presentable,
      rules: m.rules,
      fields: m.fields,
    };
  }
  const fragment = fs.readFileSync(
    path.join(SCAFFOLD, "src", "lib", "_schema-helpers.fragment.ts"),
    "utf8"
  );
  const header = [
    "// Generated by synth-next-template.mjs from db_schema.json",
    "// Schema metadata + data-access helpers. Re-run the generator to refresh.",
    "",
    "export type FieldDef = {",
    "  name: string;",
    "  type: string;",
    "  required?: boolean;",
    "  unique?: boolean;",
    "  fk?: string;",
    "  relationTarget?: string;",
    "  options?: { values?: string[] };",
    "};",
    "",
    "export type CollectionMeta = {",
    "  name: string;",
    "  model: string;",
    "  accessor: string;",
    "  label: string;",
    "  auth: boolean;",
    "  presentable: string;",
    "  rules: { list: string; view: string; create: string; update: string; delete: string };",
    "  fields: FieldDef[];",
    "};",
    "",
    `const COLLECTIONS: Record<string, CollectionMeta> = ${JSON.stringify(data, null, 2)};`,
    "",
    `export const AUTH = { collection: ${JSON.stringify(authName)}, accessor: "user" } as const;`,
    "",
  ].join("\n");
  return header + fragment;
}

function emitSeedTs() {
  return [
    'import { PrismaClient } from "@prisma/client";',
    'import { PrismaLibSql } from "@prisma/adapter-libsql";',
    'import bcrypt from "bcryptjs";',
    "",
    "const adapter = new PrismaLibSql({",
    '  url: process.env.DATABASE_URL || "file:./dev.db",',
    "});",
    "const prisma = new PrismaClient({ adapter });",
    "",
    "async function main() {",
    '  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();',
    '  const password = process.env.ADMIN_PASSWORD || "admin12345";',
    "  const hash = await bcrypt.hash(password, 12);",
    "  await prisma.user.upsert({",
    "    where: { email },",
    "    update: { role: \"admin\" },",
    '    create: { email, password: hash, name: "Admin", role: "admin" },',
    "  });",
    "  console.log(`Seed complete: admin user ${email}`);",
    "}",
    "",
    "main()",
    "  .catch((e) => {",
    "    console.error(e);",
    "    process.exit(1);",
    "  })",
    "  .finally(async () => {",
    "    await prisma.$disconnect();",
    "  });",
    "",
  ].join("\n");
}

const TOP_LEVEL_FILES = [
  "package.json",
  "next.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "prisma.config.ts",
  "Dockerfile",
  "docker-entrypoint.sh",
  "docker-compose.prod.yml",
  ".gitignore",
  ".dockerignore",
  ".env.example",
];

const OLD_ARTIFACTS = [
  "index.html",
  "vite.config.ts",
  "vite.config.js",
  "tailwind.config.js",
  "tailwind.config.ts",
  "postcss.config.js",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "components.json",
  "nginx.conf",
  "docker-compose.yaml",
  "Caddyfile",
  "pocketbase",
  "pb_data",
  ".agent_state",
];

function rm(p) {
  fs.rmSync(p, { recursive: true, force: true });
}
function copyFile(a, b) {
  fs.mkdirSync(path.dirname(b), { recursive: true });
  fs.copyFileSync(a, b);
}

function validatePrisma(schema) {
  const errors = [];
  const open = (schema.match(/{/g) || []).length;
  const close = (schema.match(/}/g) || []).length;
  if (open !== close) errors.push(`unbalanced braces: {=${open} }=${close}`);
  const models = schema.split(/^model /m).slice(1);
  for (const block of models) {
    const name = block.split(/\s|\{/)[0];
    if (!/@id\b/.test(block)) errors.push(`model ${name} has no @id`);
    const seen = new Set();
    for (const line of block.split("\n")) {
      const m = line.match(/^\s{2}([A-Za-z_][A-Za-z0-9_]*)\s/);
      if (m && !line.includes("@@")) {
        if (seen.has(m[1])) errors.push(`model ${name} duplicate field ${m[1]}`);
        seen.add(m[1]);
      }
    }
  }
  // Every named relation must appear on both sides (forward + reverse).
  const relCounts = {};
  for (const m of schema.matchAll(/"(Rel_[^"]+)"/g)) {
    relCounts[m[1]] = (relCounts[m[1]] || 0) + 1;
  }
  for (const [name, n] of Object.entries(relCounts)) {
    if (n !== 2) errors.push(`relation ${name} appears ${n} time(s), expected 2`);
  }
  return { ok: errors.length === 0, errors };
}

function convert(category) {
  const catDir = path.join(TEMPLATES, category);
  const schemaPath = path.join(catDir, "db_schema.json");
  if (!fs.existsSync(catDir)) {
    console.warn(`[skip] ${category}: directory not found`);
    return null;
  }
  if (!fs.existsSync(schemaPath)) {
    console.warn(`[skip] ${category}: no db_schema.json`);
    return null;
  }
  const db = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const { metas, authName } = build(db.collections || []);
  const prisma = emitPrisma(metas);
  const schemaTs = emitSchemaTs(metas, authName);
  const seedTs = emitSeedTs();
  const title = labelName(category);

  const report = { category, models: metas.length, files: [], validation: null };

  if (DRY) {
    report.validation = validatePrisma(prisma);
    report.dry = true;
    return report;
  }

  // 1) wipe old app sources
  rm(path.join(catDir, "src"));
  // 2) copy scaffold src + top-level files
  fs.cpSync(path.join(SCAFFOLD, "src"), path.join(catDir, "src"), { recursive: true });
  for (const f of TOP_LEVEL_FILES) {
    copyFile(path.join(SCAFFOLD, f), path.join(catDir, f));
  }
  fs.cpSync(path.join(SCAFFOLD, "public"), path.join(catDir, "public"), { recursive: true });
  // 3) remove leftover Vite/PocketBase artifacts
  if (!KEEP_VITE) {
    for (const a of OLD_ARTIFACTS) rm(path.join(catDir, a));
  }
  // 4) drop the build fragment from the generated app
  rm(path.join(catDir, "src", "lib", "_schema-helpers.fragment.ts"));
  // 5) write derived files
  fs.mkdirSync(path.join(catDir, "prisma"), { recursive: true });
  fs.writeFileSync(path.join(catDir, "prisma", "schema.prisma"), prisma);
  fs.writeFileSync(path.join(catDir, "prisma", "seed.ts"), seedTs);
  fs.writeFileSync(path.join(catDir, "src", "lib", "schema.ts"), schemaTs);
  // package.json name
  const pkg = JSON.parse(fs.readFileSync(path.join(catDir, "package.json"), "utf8"));
  pkg.name = category;
  fs.writeFileSync(path.join(catDir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  // PWA manifest
  const manifestPath = path.join(catDir, "public", "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.name = title;
  manifest.short_name = title;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  // .env.example site name
  const envPath = path.join(catDir, ".env.example");
  let env = fs.readFileSync(envPath, "utf8");
  env = env.replace(/NEXT_PUBLIC_SITE_NAME=.*/, `NEXT_PUBLIC_SITE_NAME=${title}`);
  fs.writeFileSync(envPath, env);
  // template manifest -> next
  const tmanPath = path.join(catDir, "manifest.json");
  if (fs.existsSync(tmanPath)) {
    const tman = JSON.parse(fs.readFileSync(tmanPath, "utf8"));
    tman.framework = "next";
    tman.recommended_packages = ["next", "react", "react-dom", "@prisma/client", "prisma", "lucide-react"];
    fs.writeFileSync(tmanPath, JSON.stringify(tman, null, 2) + "\n");
  }

  report.validation = validatePrisma(prisma);
  return report;
}

function main() {
  let cats = targets;
  if (ALL || cats.length === 0) {
    cats = fs
      .readdirSync(TEMPLATES)
      .filter((d) => {
        const full = path.join(TEMPLATES, d);
        return (
          fs.statSync(full).isDirectory() &&
          fs.existsSync(path.join(full, "db_schema.json"))
        );
      })
      .sort();
  }
  console.log(`Converting ${cats.length} template(s): ${cats.join(", ")}`);
  if (DRY) console.log("(dry-run: no files written)");
  const results = [];
  for (const c of cats) {
    try {
      const r = convert(c);
      if (r) results.push(r);
    } catch (e) {
      console.error(`[error] ${c}: ${e.message}`);
      results.push({ category: c, error: e.message });
    }
  }
  console.log("\nSummary:");
  for (const r of results) {
    if (r.error) {
      console.log(`  ✗ ${r.category}: ${r.error}`);
      continue;
    }
    const v = r.validation;
    const tag = v && v.ok ? "✓" : "⚠";
    console.log(
      `  ${tag} ${r.category}: ${r.models} models` +
        (v && !v.ok ? ` — ${v.errors.join("; ")}` : "")
    );
  }
  const bad = results.filter((r) => r.error || (r.validation && !r.validation.ok));
  process.exit(bad.length ? 1 : 0);
}

main();
