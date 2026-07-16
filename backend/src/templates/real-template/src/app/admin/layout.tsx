import { LanguageProvider } from "@/lib/i18n/language-provider";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <LanguageProvider scope="admin">
      {children}
    </LanguageProvider>
  );
}
