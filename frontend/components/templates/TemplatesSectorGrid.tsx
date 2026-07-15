"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TemplateSectorRow } from "@/lib/templates/catalog";
import { PRESET_ROWS } from "@/lib/templates/presets";

type Props = {
  sectors: TemplateSectorRow[];
};

const cardEase = [0.22, 1, 0.36, 1] as const;

function getTemplateCount(sectorId: string): number {
  return PRESET_ROWS.filter((p) => p.sector_id === sectorId).length;
}

export default function TemplatesSectorGrid({ sectors }: Props) {
  const t = useTranslations("templates");
  const tSectors = useTranslations("templateSectors");

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {sectors.map((sector, index) => {
        const count = getTemplateCount(sector.id);
        const sectorName = tSectors.has(`${sector.slug}.name`)
          ? tSectors(`${sector.slug}.name`)
          : sector.name;
        return (
          <li key={sector.id}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: cardEase, delay: index * 0.06 }}
            >
              <Link
                href={`/templates/${sector.slug}`}
                aria-label={t("sectorCardAria", { name: sectorName, count })}
                className="group relative flex aspect-[16/11] overflow-hidden rounded-3xl border border-white/10 bg-background-soft/40 shadow-[0_0_60px_rgba(15,23,42,0.9)] transition duration-500 hover:border-glow-cyan/30 hover:shadow-[0_0_80px_rgba(34,211,238,0.15)]"
              >
                <Image
                  src={sector.background_image_url}
                  alt=""
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.06]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  priority={index < 3}
                />
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20 opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-glow-purple/10 mix-blend-soft-light" />

                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100 bg-gradient-to-t from-glow-cyan/5 via-transparent to-transparent" />

                {/* Content */}
                <div className="relative mt-auto flex w-full items-end justify-between p-5 sm:p-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-xl font-semibold tracking-tight text-white drop-shadow-lg sm:text-2xl">
                      {sectorName}
                    </span>
                    <span className="text-xs font-medium text-zinc-400">
                      {t("templateCount", { count })}
                    </span>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 backdrop-blur-md transition duration-300 group-hover:border-glow-cyan/40 group-hover:bg-glow-cyan/10 group-hover:text-white">
                    <ArrowUpRight size={18} className="transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </Link>
            </motion.div>
          </li>
        );
      })}
    </ul>
  );
}
