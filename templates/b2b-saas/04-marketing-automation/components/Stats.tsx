import { content } from "@/lib/content";

export default function Stats() {
  return (
    <section className="bg-foreground text-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {content.stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-4xl font-bold tracking-tight">{s.value}</p>
              <p className="mt-2 text-sm text-background/70">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
