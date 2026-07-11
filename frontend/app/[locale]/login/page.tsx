"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LoginSection from "@/components/landing/LoginSection";

export default function LoginPage() {
  const t = useTranslations("loginPage");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <LoginSection />
      </div>

      <p className="mt-8 text-center text-sm text-zinc-500">
        {t("backToHome")}{" "}
        <Link href="/" className="text-primary hover:underline">
          {t("homeLink")}
        </Link>
      </p>
    </div>
  );
}
