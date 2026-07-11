"use client";

import TemplateCard from "@/components/templates/TemplateCard";
import type { TemplatePresetRow } from "@/lib/templates/types";

type Props = {
  presets: TemplatePresetRow[];
};

export default function TemplatePresetGrid({ presets }: Props) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {presets.map((preset, index) => (
        <li key={preset.id}>
          <TemplateCard preset={preset} animateDelay={index * 0.05} />
        </li>
      ))}
    </ul>
  );
}
