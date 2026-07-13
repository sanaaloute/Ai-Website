# B2B SaaS Templates

10 production-ready landing page templates for B2B SaaS products. Every template is a **standalone Next.js (App Router) + TypeScript + Tailwind CSS** project — no shared dependencies, no backend required. Clone one, `npm install`, and ship.

## Templates

| # | Template | Niche | Brand | Directory |
|---|----------|-------|-------|-----------|
| 01 | Analytics Platform | Product analytics | PulseMetrics | [`01-analytics-platform`](./01-analytics-platform) |
| 02 | CRM & Sales Pipeline | Sales / CRM | DealFlow | [`02-crm-sales-pipeline`](./02-crm-sales-pipeline) |
| 03 | Project Management | Product & eng teams | TaskPilot | [`03-project-management`](./03-project-management) |
| 04 | Marketing Automation | Growth teams | BrightWave | [`04-marketing-automation`](./04-marketing-automation) |
| 05 | DevOps Monitoring | DevOps / SRE | UptimeCloud | [`05-devops-monitoring`](./05-devops-monitoring) |
| 06 | HR & People Ops | HR teams | PeopleHub | [`06-hr-people-ops`](./06-hr-people-ops) |
| 07 | Billing & Invoicing | Fintech / finance | InvoiceFlow | [`07-billing-invoicing`](./07-billing-invoicing) |
| 08 | Customer Support | Support teams | SupportDesk | [`08-customer-support`](./08-customer-support) |
| 09 | Security & Compliance | Security / IT | ShieldOps | [`09-security-compliance`](./09-security-compliance) |
| 10 | AI Workflow Automation | Operations | NeuralWorks | [`10-ai-workflow-automation`](./10-ai-workflow-automation) |

Machine-readable catalog: [`index.json`](./index.json)

## What's in each template

- Sticky navbar with mobile menu
- Hero with product dashboard mockup (metrics driven by content)
- Logo cloud, 6-feature grid, stats band, 3 testimonials
- 3-tier pricing (highlighted plan), accordion FAQ, CTA, 4-column footer
- Fully responsive, accessible, static-rendered (builds to static HTML)
- No image assets required — pure HTML/CSS, deploys anywhere

## Use a template

```bash
# after this directory is published to GitHub:
git clone https://github.com/<org>/ai-website-templates.git
cd ai-website-templates/b2b-saas/01-analytics-platform
npm install
npm run dev
```

## Customize

| What | Where |
| --- | --- |
| All copy, pricing, testimonials, FAQ | `lib/content.ts` |
| Colors / theme | `:root` CSS variables in `app/globals.css` |
| Page title & meta description | `app/layout.tsx` |
| Section layout & styling | `components/*.tsx` |

All templates share the same component structure, so anything you learn in one transfers to the others.
