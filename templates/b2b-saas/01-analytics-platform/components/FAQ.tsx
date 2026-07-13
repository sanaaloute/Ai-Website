import { ChevronDown } from "lucide-react";
import { content } from "@/lib/content";

export default function FAQ() {
  const { faq } = content;

  return (
    <section id="faq" className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          {faq.title}
        </h2>
        <div className="mt-12 space-y-4">
          {faq.items.map((item) => (
            <details
              key={item.question}
              className="group rounded-xl border border-border bg-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-semibold">
                {item.question}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-6 pb-4 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
