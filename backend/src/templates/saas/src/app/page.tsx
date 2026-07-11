import Link from "next/link";
import { dataSource } from "@/lib/data-source";
import { baseCollections } from "@/lib/schema";

export const dynamic = "force-dynamic";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "My App";

export default async function Home() {
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
    <div className="mx-auto max-w-6xl px-6 py-16">
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {siteName}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-400">
          A generated full-stack app powered by Next.js, Prisma and SQLite.
          Manage your data from the admin dashboard.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/admin"
            className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Open admin
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-slate-700 px-5 py-2.5 text-sm font-medium hover:bg-slate-900"
          >
            Create account
          </Link>
        </div>
      </section>

      {cols.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Collections
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cols.map((c) => (
              <Link
                key={c.name}
                href={`/admin/${c.name}`}
                className="rounded-lg border border-slate-800 bg-slate-950/50 p-5 transition hover:border-indigo-600/60 hover:bg-slate-900/60"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.label}</span>
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300">
                    {countMap[c.name] ?? 0}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
