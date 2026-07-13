/**
 * Site content — the ONLY file you need to edit to re-brand this template.
 * Every section on the page reads from this object.
 */

export type IconName =
  | "BarChart3"
  | "LineChart"
  | "PieChart"
  | "TrendingUp"
  | "Users"
  | "Zap"
  | "Shield"
  | "Lock"
  | "Clock"
  | "Globe"
  | "Bell"
  | "Calendar"
  | "CreditCard"
  | "Headphones"
  | "Workflow"
  | "Bot"
  | "Mail"
  | "FileText"
  | "Target"
  | "Settings"
  | "Database"
  | "Cloud"
  | "Code"
  | "Rocket"
  | "CheckCircle"
  | "Star"
  | "Heart"
  | "Layers"
  | "Gauge"
  | "Filter"
  | "MessageSquare"
  | "Repeat"
  | "Search"
  | "Smartphone"
  | "Award"
  | "Briefcase";

export type NavLink = { label: string; href: string };
export type Metric = { label: string; value: string; change: string };
export type Feature = { icon: IconName; title: string; description: string };
export type Stat = { value: string; label: string };
export type Testimonial = {
  quote: string;
  author: string;
  role: string;
  company: string;
};
export type PricingTier = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
};
export type FaqItem = { question: string; answer: string };
export type FooterColumn = { title: string; links: string[] };

export type SiteContent = {
  brand: { name: string; tagline: string };
  nav: { links: NavLink[]; cta: string };
  hero: {
    badge: string;
    title: string;
    highlight: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    note: string;
    metrics: Metric[];
  };
  logos: string[];
  features: { title: string; subtitle: string; items: Feature[] };
  stats: Stat[];
  testimonials: { title: string; subtitle: string; items: Testimonial[] };
  pricing: { title: string; subtitle: string; tiers: PricingTier[] };
  faq: { title: string; items: FaqItem[] };
  cta: { title: string; subtitle: string; button: string };
  footer: { description: string; columns: FooterColumn[] };
};

export const content: SiteContent = {
  brand: {
    name: "InvoiceFlow",
    tagline: "Billing & invoicing for B2B finance teams",
  },

  nav: {
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Customers", href: "#testimonials" },
      { label: "FAQ", href: "#faq" },
    ],
    cta: "Start free trial",
  },

  hero: {
    badge: "Now with automated revenue recognition",
    title: "Get paid faster,",
    highlight: "reconcile automatically",
    subtitle:
      "InvoiceFlow automates invoicing, subscriptions, dunning, and payments — and syncs everything to your books. Close the month faster and collect what you're owed.",
    primaryCta: "Start free trial",
    secondaryCta: "Book a demo",
    note: "14-day free trial · No credit card required",
    metrics: [
      { label: "Invoices sent", value: "2.1M", change: "+18% vs last quarter" },
      { label: "Avg. days to payment", value: "9 days", change: "-6 days vs industry avg" },
      { label: "Revenue collected", value: "$48.7M", change: "+22% this month" },
    ],
  },

  logos: ["Ironwood", "Copperline", "Saltmarsh", "Fairway", "Marigold", "Tessellate"],

  features: {
    title: "The complete billing engine for B2B finance",
    subtitle:
      "From the first quote to recognized revenue — one platform for AR teams who refuse to chase payments in spreadsheets.",
    items: [
      {
        icon: "FileText",
        title: "Smart invoicing",
        description:
          "Create branded, tax-compliant invoices in seconds with templates, line-item catalogs, and automatic PO and contract references your customers expect.",
      },
      {
        icon: "Repeat",
        title: "Subscriptions & recurring billing",
        description:
          "Bill monthly, annually, or on usage-based plans. Handle upgrades, proration, and mid-cycle changes without touching a spreadsheet.",
      },
      {
        icon: "Bell",
        title: "Automatic dunning",
        description:
          "Recover failed payments with smart retry schedules and escalating email sequences — most teams recover 70% of failed charges automatically.",
      },
      {
        icon: "CreditCard",
        title: "Flexible payments",
        description:
          "Accept cards, ACH, SEPA, and wire transfers with a hosted payment page. Customers pay in one click and you reconcile nothing by hand.",
      },
      {
        icon: "BarChart3",
        title: "Revenue recognition",
        description:
          "Generate ASC 606 / IFRS 15-compliant revenue schedules automatically and hand your auditors a clean, exportable trail at month-end.",
      },
      {
        icon: "Workflow",
        title: "Accounting sync",
        description:
          "Two-way sync with QuickBooks, Xero, and NetSuite keeps invoices, payments, and credit notes matched — so your books are always close-ready.",
      },
    ],
  },

  stats: [
    { value: "$2.4B+", label: "Collected annually" },
    { value: "11 days", label: "Faster average payment" },
    { value: "99.9%", label: "Billing accuracy" },
    { value: "1,800+", label: "Finance teams onboard" },
  ],

  testimonials: {
    title: "Trusted by finance teams who close on time",
    subtitle: "From first invoice to IPO-ready books — here's what customers say.",
    items: [
      {
        quote:
          "Our days sales outstanding dropped from 34 to 19 in one quarter. Automated reminders and one-click payment links did what three follow-up emails never could.",
        author: "Greg Lawson",
        role: "CFO",
        company: "Ironwood",
      },
      {
        quote:
          "Month-end used to be a week of reconciliation. With the NetSuite sync, our books match the bank on day two — my controller actually sleeps now.",
        author: "Nina Kowalski",
        role: "Controller",
        company: "Copperline",
      },
      {
        quote:
          "We bill 400 customers on usage-based plans. InvoiceFlow handles every proration and overage correctly — we haven't sent a wrong invoice in over a year.",
        author: "Tom Becker",
        role: "Head of Finance Operations",
        company: "Fairway",
      },
    ],
  },

  pricing: {
    title: "Pricing that pays for itself",
    subtitle: "Collect faster and close sooner — most teams see ROI in the first month.",
    tiers: [
      {
        name: "Starter",
        price: "$79",
        period: "/month",
        description: "For small businesses professionalizing their invoicing.",
        features: [
          "Up to 100 invoices / month",
          "Branded invoice templates",
          "Card & ACH payments",
          "Automatic payment reminders",
          "Email support",
        ],
        cta: "Start free trial",
      },
      {
        name: "Growth",
        price: "$249",
        period: "/month",
        description: "For finance teams automating billing and collections.",
        features: [
          "Unlimited invoices",
          "Subscriptions & recurring billing",
          "Smart dunning & payment retries",
          "Revenue recognition reports",
          "QuickBooks & Xero sync",
          "Priority support",
        ],
        cta: "Start free trial",
        highlighted: true,
      },
      {
        name: "Enterprise",
        price: "Custom",
        period: "",
        description: "For organizations with scale, security, and compliance needs.",
        features: [
          "Multi-entity & multi-currency",
          "NetSuite integration",
          "SSO, audit logs & approval workflows",
          "SOC 2 Type II & PCI DSS",
          "Custom payment terms & contracts",
          "Dedicated success manager",
        ],
        cta: "Contact sales",
      },
    ],
  },

  faq: {
    title: "Frequently asked questions",
    items: [
      {
        question: "How long does setup take?",
        answer:
          "Most teams send their first invoice within an hour. Connect your accounting software and payment processor, import customers, and you're live — no engineering required.",
      },
      {
        question: "Which payment methods can my customers use?",
        answer:
          "Credit and debit cards, ACH and SEPA direct debit, and wire transfers — all through a hosted payment page you can brand with your logo and colors.",
      },
      {
        question: "How does automatic dunning work?",
        answer:
          "When a payment fails, InvoiceFlow retries the charge on a smart schedule and sends escalating reminders to the customer. You set the rules once; we recover the revenue.",
      },
      {
        question: "Do you handle taxes and multi-currency?",
        answer:
          "Yes. Apply VAT, GST, and US sales tax rules automatically by region, and invoice customers in 135+ currencies with automatic exchange-rate handling.",
      },
      {
        question: "Is InvoiceFlow secure for payment data?",
        answer:
          "We never store raw card numbers — payments are processed through PCI DSS Level 1 providers. All data is encrypted in transit and at rest, and we're SOC 2 Type II certified.",
      },
      {
        question: "Can I migrate from QuickBooks invoicing or Stripe Billing?",
        answer:
          "Absolutely. Import your customers, open invoices, and active subscriptions with our migration toolkit — most teams complete the switch in a single afternoon.",
      },
    ],
  },

  cta: {
    title: "Stop chasing payments. Start collecting.",
    subtitle:
      "Join 1,800+ finance teams who get paid faster and close their books sooner with InvoiceFlow.",
    button: "Start your 14-day free trial",
  },

  footer: {
    description:
      "Billing and invoicing software for B2B finance teams — invoices, subscriptions, dunning, payments, and revenue recognition in one platform.",
    columns: [
      { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog"] },
      { title: "Solutions", links: ["Finance teams", "Agencies", "SaaS billing", "Accountants"] },
      { title: "Resources", links: ["Documentation", "Blog", "Guides", "Status"] },
      { title: "Company", links: ["About", "Careers", "Contact", "Privacy"] },
    ],
  },
};
