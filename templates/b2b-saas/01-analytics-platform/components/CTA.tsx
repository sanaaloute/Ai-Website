import { content } from "@/lib/content";

export default function CTA() {
  const { cta } = content;

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <div className="rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-16">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {cta.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
          {cta.subtitle}
        </p>
        <a
          href="#pricing"
          className="mt-8 inline-flex h-12 items-center rounded-lg bg-background px-6 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-background/90"
        >
          {cta.button}
        </a>
      </div>
    </section>
  );
}
