import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";

const inter = localFont({
  // Self-hosted (latin, variable weights 100–900) so builds don't depend on
  // fetching Google Fonts at build time.
  src: "./fonts/InterVariable.woff2",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: dictionaries[DEFAULT_LOCALE].metadata.title,
  description: dictionaries[DEFAULT_LOCALE].metadata.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={DEFAULT_LOCALE} dir="ltr" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
