import Link from "next/link";
import { notFound } from "next/navigation";
import { dataSource } from "@/lib/data-source";
import { getCollection } from "@/lib/schema";
import { stringify } from "@/lib/utils";
import { DeleteButton } from "../_components/DeleteButton";

export const dynamic = "force-dynamic";

const TABLE_TYPES = new Set(["text", "email", "url", "number", "select", "bool"]);

function cell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    const s = stringify(value);
    return s.length > 40 ? s.slice(0, 40) + "…" : s;
  }
  const s = String(value);
  return s.length > 60 ? s.slice(0, 60) + "…" : s;
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  const meta = getCollection(collection);
  if (!meta || meta.auth) notFound();

  const items = await dataSource.list(collection, { take: 100 });

  const scalarFields = meta.fields
    .filter((f) => TABLE_TYPES.has(f.type))
    .map((f) => f.name);
  const columns = Array.from(
    new Set(
      [meta.presentable, ...scalarFields].filter((c): c is string => !!c)
    )
  ).slice(0, 5);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{meta.label}</h1>
        <Link
          href={`/admin/${collection}/new`}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          New record
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/80 text-slate-400">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-4 py-3 font-medium">
                  {c}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No records yet.
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={String(row.id)} className="hover:bg-slate-900/40">
                {columns.map((c) => (
                  <td key={c} className="px-4 py-3 text-slate-200">
                    {cell(row[c])}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/admin/${collection}/${String(row.id)}/edit`}
                      className="text-sm text-indigo-400 hover:text-indigo-300"
                    >
                      Edit
                    </Link>
                    <DeleteButton collection={collection} id={String(row.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
