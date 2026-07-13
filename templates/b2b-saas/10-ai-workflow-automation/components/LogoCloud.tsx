import { content } from "@/lib/content";

export default function LogoCloud() {
  return (
    <section className="border-b border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Trusted by fast-growing teams
        </p>
        <div className="mt-6 grid grid-cols-2 items-center gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          {content.logos.map((logo) => (
            <span
              key={logo}
              className="text-center text-lg font-bold tracking-tight text-muted-foreground/70"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
