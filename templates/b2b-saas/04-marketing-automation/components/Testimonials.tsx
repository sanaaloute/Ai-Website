import { content } from "@/lib/content";

export default function Testimonials() {
  const { testimonials } = content;

  return (
    <section
      id="testimonials"
      className="border-b border-border bg-muted/40"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {testimonials.title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {testimonials.subtitle}
          </p>
        </div>
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {testimonials.items.map((t) => (
            <figure
              key={t.author}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <blockquote className="text-sm leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {t.author
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
                <div>
                  <p className="text-sm font-semibold">{t.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.role}, {t.company}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
