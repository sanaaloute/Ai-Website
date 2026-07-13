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
    name: "PulseMetrics",
    tagline: "Product analytics for B2B teams",
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
    badge: "Now with AI-powered insights",
    title: "Product analytics that",
    highlight: "turn data into decisions",
    subtitle:
      "PulseMetrics gives B2B teams real-time visibility into every user journey — funnels, retention, and revenue — without a data engineering team.",
    primaryCta: "Start free trial",
    secondaryCta: "Book a demo",
    note: "14-day free trial · No credit card required",
    metrics: [
      { label: "Active users", value: "48,392", change: "+12.5% vs last month" },
      { label: "Conversion rate", value: "6.8%", change: "+0.9 pts this week" },
      { label: "Avg. session", value: "4m 12s", change: "+18s vs last week" },
    ],
  },

  logos: ["Northwind", "Quantic", "Vertex Labs", "Brightpath", "Mosaic", "Hyperplane"],

  features: {
    title: "Everything you need to understand your users",
    subtitle:
      "From the first pageview to renewal — one platform for product, marketing, and revenue teams.",
    items: [
      {
        icon: "BarChart3",
        title: "Real-time dashboards",
        description:
          "Build shareable dashboards in minutes. Every metric updates live as events stream in — no nightly batch jobs.",
      },
      {
        icon: "Filter",
        title: "Funnel analysis",
        description:
          "See exactly where users drop off across signup, onboarding, and checkout. Compare funnels by segment or cohort.",
      },
      {
        icon: "Repeat",
        title: "Retention cohorts",
        description:
          "Track week-over-week retention for every cohort and find the behaviors that keep customers coming back.",
      },
      {
        icon: "CreditCard",
        title: "Revenue analytics",
        description:
          "Connect Stripe or Chargebee and tie product usage directly to MRR, expansion, and churn.",
      },
      {
        icon: "Bell",
        title: "Anomaly alerts",
        description:
          "Get notified in Slack the moment a metric moves outside its normal range — before customers do.",
      },
      {
        icon: "Workflow",
        title: "50+ integrations",
        description:
          "Segment, Snowflake, BigQuery, HubSpot, and more. Warehouse-native or fully managed — your choice.",
      },
    ],
  },

  stats: [
    { value: "10B+", label: "Events processed monthly" },
    { value: "99.99%", label: "Uptime SLA" },
    { value: "4.9/5", label: "Average customer rating" },
    { value: "2,000+", label: "B2B teams onboard" },
  ],

  testimonials: {
    title: "Loved by data-driven teams",
    subtitle: "From seed-stage startups to public companies — here's what customers say.",
    items: [
      {
        quote:
          "We replaced three tools with PulseMetrics. Our PMs finally answer their own questions instead of waiting on the data team.",
        author: "Sarah Chen",
        role: "VP of Product",
        company: "Northwind",
      },
      {
        quote:
          "Funnel analysis used to take us a week of SQL. Now it's a two-minute question we ask in a board meeting, live.",
        author: "Marcus Reed",
        role: "Head of Growth",
        company: "Quantic",
      },
      {
        quote:
          "The anomaly alerts caught a broken signup flow within an hour of deploy. That alone paid for the year.",
        author: "Priya Nair",
        role: "CTO",
        company: "Vertex Labs",
      },
    ],
  },

  pricing: {
    title: "Simple, transparent pricing",
    subtitle: "Start free, scale when you grow. No per-seat surprises.",
    tiers: [
      {
        name: "Starter",
        price: "$49",
        period: "/month",
        description: "For small teams getting started with product analytics.",
        features: [
          "Up to 1M events / month",
          "5 dashboards",
          "Funnels & retention reports",
          "7-day data history",
          "Email support",
        ],
        cta: "Start free trial",
      },
      {
        name: "Growth",
        price: "$149",
        period: "/month",
        description: "For scaling teams that need deeper insight and automation.",
        features: [
          "Up to 25M events / month",
          "Unlimited dashboards",
          "Revenue analytics & integrations",
          "Anomaly alerts",
          "1-year data history",
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
          "Unlimited events",
          "Warehouse-native deployment",
          "SSO, SCIM & audit logs",
          "SOC 2 Type II & GDPR",
          "Dedicated success manager",
          "99.99% uptime SLA",
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
          "Most teams are live in under 30 minutes. Add our snippet or connect Segment, and events start flowing immediately.",
      },
      {
        question: "Do you store raw event data?",
        answer:
          "Yes — on Growth and Enterprise plans you keep full-fidelity raw events, exportable to your warehouse at any time.",
      },
      {
        question: "Can I migrate from Mixpanel or Amplitude?",
        answer:
          "Absolutely. Our migration toolkit imports historical events, dashboards, and cohorts with a few clicks.",
      },
      {
        question: "Is PulseMetrics GDPR compliant?",
        answer:
          "Yes. We offer EU data residency, DPA signing, and built-in consent-aware tracking on all plans.",
      },
      {
        question: "What happens if I exceed my event limit?",
        answer:
          "We never drop data. You'll get a heads-up at 80% usage and can upgrade or add overage capacity in one click.",
      },
      {
        question: "Do you offer discounts for startups?",
        answer:
          "Yes — early-stage startups get 50% off the Growth plan for their first year. Reach out to sales to apply.",
      },
    ],
  },

  cta: {
    title: "Start making data-driven decisions today",
    subtitle:
      "Join 2,000+ B2B teams who replaced their analytics stack with PulseMetrics.",
    button: "Start your 14-day free trial",
  },

  footer: {
    description:
      "Product analytics that turn data into decisions — for product, growth, and revenue teams.",
    columns: [
      { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog"] },
      { title: "Solutions", links: ["Product teams", "Marketing", "Revenue ops", "Startups"] },
      { title: "Resources", links: ["Documentation", "Blog", "Guides", "Status"] },
      { title: "Company", links: ["About", "Careers", "Contact", "Privacy"] },
    ],
  },
};
