"use client";

import { useLanguage } from "@/lib/i18n/language-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Globe, Check } from "lucide-react";
import { supportedLocales, localeNames, Locale } from "@/lib/i18n/translations";

interface LanguageToggleProps {
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "icon";
  className?: string;
}

export function LanguageToggle({
  variant = "ghost",
  size = "sm",
  className,
}: LanguageToggleProps) {
  const { locale, setLocale } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant, size }), className)}
        aria-label="Select language"
      >
        <Globe className="w-4 h-4 mr-1" />
        <span className="uppercase text-xs font-semibold">{locale}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {supportedLocales.map((l: Locale) => (
          <DropdownMenuItem
            key={l}
            onClick={() => setLocale(l)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>{localeNames[l]}</span>
            {locale === l && <Check className="w-4 h-4 text-cyan-400" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
