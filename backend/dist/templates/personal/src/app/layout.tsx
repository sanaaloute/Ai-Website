import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Toaster } from "sonner";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "My App";

export const metadata: Metadata = {
  title: siteName,
  description: `${siteName} — powered by Next.js + Prisma`,
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              {siteName}
            </Link>
            <nav className="flex items-center gap-5 text-sm text-slate-300">
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <Link href="/admin" className="hover:text-white">
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-800/80 px-6 py-6 text-center text-xs text-slate-500">
          {siteName}
        </footer>
        <Toaster position="top-right" richColors theme="dark" />
      </body>
    </html>
  );
}
