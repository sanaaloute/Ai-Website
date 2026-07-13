# UptimeCloud — DevOps Monitoring Template

A production-ready **B2B SaaS landing page** template for a monitoring & observability product, built with **Next.js (App Router) + TypeScript + Tailwind CSS**.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
```

## What's inside

- Sticky navbar with mobile menu
- Hero with live monitoring metrics (uptime, response time, incidents)
- Logo cloud ("trusted by")
- 6-feature grid with Lucide icons
- Stats band
- 3 testimonials
- 3-tier pricing (with "most popular" highlight)
- Accordion FAQ (no JS — native `<details>`)
- Full-width CTA + 4-column footer

## Customizing

| What | Where |
| --- | --- |
| All copy, pricing, testimonials, FAQ | `lib/content.ts` |
| Colors / theme | `:root` CSS variables in `app/globals.css` |
| Page metadata (title, description) | `app/layout.tsx` |
| Section layout / styling | `components/*.tsx` |

No images or external assets are required — everything is rendered with HTML/CSS so the template works offline and deploys anywhere (Vercel, Netlify, Docker, static export).
