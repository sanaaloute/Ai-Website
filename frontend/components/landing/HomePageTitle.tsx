"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

const ease = [0.22, 1, 0.36, 1] as const;

export default function HomePageTitle() {
  const t = useTranslations("homePageTitle");
  return (
    <header className="flex w-full flex-col items-center pb-10 text-center sm:pb-12">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl"
      >
        {t("rotating1")}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.1 }}
        className="mt-4 max-w-xl text-base text-zinc-400 sm:text-lg"
      >
        {t("rotating2")}
      </motion.p>
    </header>
  );
}
