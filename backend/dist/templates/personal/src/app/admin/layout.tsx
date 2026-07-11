import Link from "next/link";
import { baseCollections } from "@/lib/schema";
import { LogoutButton } from "./_components/LogoutButton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cols = baseCollections();
  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 border-r border-slate-800 bg-slate-950/60 px-3 py-6 md:block">
        <div className="mb-6 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Admin
        </div>
        <nav className="space-y-1">
          <Link
            href="/admin"
            className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-900 hover:text-white"
          >
            Dashboard
          </Link>
          {cols.map((c) => (
            <Link
              key={c.name}
              href={`/admin/${c.name}`}
              className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-900 hover:text-white"
            >
              {c.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-slate-800 pt-4">
          <LogoutButton />
        </div>
      </aside>
      <div className="flex-1 px-6 py-8">{children}</div>
    </div>
  );
}
