import Link from "next/link";
import { dataSource } from "@/lib/data-source";
import { baseCollections } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const cols = baseCollections();
  const counts = await Promise.all(
    cols.map(async (c) => {
      try {
        return [c.name, await dataSource.count(c.name)] as const;
      } catch {
        return [c.name, 0] as const;
      }
    })
  );
  const countMap = Object.fromEntries(counts);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cols.map((c) => (
          <Link
            key={c.name}
            href={`/admin/${c.name}`}
            className="rounded-lg border border-slate-800 bg-slate-950/50 p-5 transition hover:border-indigo-600/60"
          >
            <div className="text-sm text-slate-400">{c.label}</div>
            <div className="mt-2 text-3xl font-semibold">
              {countMap[c.name] ?? 0}
            </div>
          </Link>
        ))}
        {cols.length === 0 && (
          <p className="text-slate-400">No collections defined.</p>
        )}
      </div>
    </div>
  );
}
