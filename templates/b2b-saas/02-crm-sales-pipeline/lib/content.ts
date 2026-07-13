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
    name: "DealFlow",
    tagline: "CRM & sales pipeline for B2B teams",
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
    badge: "New: AI deal scoring is live",
    title: "Close more deals with",
    highlight: "less busywork",
    subtitle:
      "DealFlow is the CRM built for modern B2B sales teams — visual pipelines, automated email sequences, and accurate forecasting, without the admin overhead.",
    primaryCta: "Start free trial",
    secondaryCta: "Book a demo",
    note: "14-day free trial · No credit card required",
    metrics: [
      { label: "Deals in pipeline", value: "$4.2M", change: "+18% vs last quarter" },
      { label: "Win rate", value: "31%", change: "+4 pts this quarter" },
      { label: "Avg. deal size", value: "$18,400", change: "+$2,100 vs last month" },
    ],
  },

  logos: ["Cobalt & Co", "ForgeLine", "SummitGrid", "TrueNorth", "Larkspur", "Ironwood"],

  features: {
    title: "Everything your sales team needs in one CRM",
    subtitle:
      "From first touch to signed contract — pipeline, outreach, and forecasting that reps actually enjoy using.",
    items: [
      {
        icon: "Layers",
        title: "Visual pipeline management",
        description:
          "Drag deals across customizable stages and spot bottlenecks at a glance. Every rep sees exactly what to work on next.",
      },
      {
        icon: "Mail",
        title: "Email sequences",
        description:
          "Automate multi-step outreach with personalized templates and smart follow-ups that pause the moment a prospect replies.",
      },
      {
        icon: "LineChart",
        title: "Accurate forecasting",
        description:
          "AI-weighted forecasts roll up rep-level predictions into a number leadership can trust — no more spreadsheet guesswork.",
      },
      {
        icon: "Clock",
        title: "Activity tracking",
        description:
          "Calls, emails, and meetings log themselves. Reps spend their day selling, not updating fields after every conversation.",
      },
      {
        icon: "Target",
        title: "AI deal scoring",
        description:
          "Every opportunity gets a health score based on engagement signals, so your team focuses on deals most likely to close.",
      },
      {
        icon: "Workflow",
        title: "Workflow automation",
        description:
          "Auto-assign leads, create follow-up tasks, and trigger Slack alerts when big deals move — no code required.",
      },
    ],
  },

  stats: [
    { value: "27%", label: "Average win-rate lift" },
    { value: "8 hrs", label: "Admin time saved per rep weekly" },
    { value: "4.8/5", label: "Average customer rating" },
    { value: "3,500+", label: "Sales teams onboard" },
  ],

  testimonials: {
    title: "Trusted by high-velocity sales teams",
    subtitle: "From 5-rep startups to global sales orgs — here's what customers say.",
    items: [
      {
        quote:
          "We cut our sales cycle by three weeks in the first quarter. Reps finally trust the CRM because it works for them, not the other way around.",
        author: "Elena Vasquez",
        role: "VP of Sales",
        company: "Cobalt & Co",
      },
      {
        quote:
          "Forecast calls used to be an hour of arguing over spreadsheets. Now we open DealFlow and the number is just... there. And it's right.",
        author: "David Okonkwo",
        role: "Director of Revenue Operations",
        company: "ForgeLine",
      },
      {
        quote:
          "The email sequences paid for the platform in a month. Our SDRs book twice as many meetings with half the manual effort.",
        author: "Hannah Lindqvist",
        role: "Head of Sales Development",
        company: "SummitGrid",
      },
    ],
  },

  pricing: {
    title: "Pricing that scales with your team",
    subtitle: "Per-seat pricing, billed monthly or annually. No setup fees, no surprises.",
    tiers: [
      {
        name: "Starter",
        price: "$29",
        period: "/user/mo",
        description: "For small sales teams getting their pipeline in order.",
        features: [
          "Up to 5 pipeline boards",
          "Contact & deal management",
          "Email tracking & templates",
          "Basic activity reports",
          "Email support",
        ],
        cta: "Start free trial",
      },
      {
        name: "Growth",
        price: "$59",
        period: "/user/mo",
        description: "For scaling teams that need automation and forecasting.",
        features: [
          "Unlimited pipelines",
          "Email sequences & automation",
          "AI deal scoring & forecasting",
          "Custom reports & dashboards",
          "Slack & calendar integrations",
          "Priority support",
        ],
        cta: "Start free trial",
        highlighted: true,
      },
      {
        name: "Enterprise",
        price: "Custom",
        period: "",
        description: "For large sales orgs with security and compliance needs.",
        features: [
          "Unlimited everything",
          "Advanced roles & permissions",
          "SSO, SCIM & audit logs",
          "SOC 2 Type II & GDPR",
          "Dedicated success manager",
          "99.9% uptime SLA",
        ],
        cta: "Contact sales",
      },
    ],
  },

  faq: {
    title: "Frequently asked questions",
    items: [
      {
        question: "How long does it take to get set up?",
        answer:
          "Most teams are fully migrated in under a day. Import contacts and deals from a CSV or connect your existing CRM, and our wizard maps your pipeline stages automatically.",
      },
      {
        question: "Can I migrate from Salesforce or HubSpot?",
        answer:
          "Yes. Our migration tool imports contacts, companies, deals, activities, and custom fields — including full email history — with no data loss.",
      },
      {
        question: "Does DealFlow work with Gmail and Outlook?",
        answer:
          "Absolutely. Two-way sync keeps every email, meeting, and task in step between your inbox and the CRM, with zero manual logging.",
      },
      {
        question: "Is there a mobile app?",
        answer:
          "Yes — native iOS and Android apps let reps update deals, log calls, and get meeting briefs on the go. Everything syncs in real time.",
      },
      {
        question: "Can I try it before my whole team commits?",
        answer:
          "Every plan starts with a 14-day free trial for unlimited users. Invite your whole team — no credit card required, and downgrade or cancel anytime.",
      },
      {
        question: "Do you offer discounts for annual billing?",
        answer:
          "Yes — pay annually and get two months free on any plan. Nonprofits and early-stage startups can contact sales for additional discounts.",
      },
    ],
  },

  cta: {
    title: "Give your reps their time back",
    subtitle:
      "Join 3,500+ sales teams closing more deals with less busywork on DealFlow.",
    button: "Start your 14-day free trial",
  },

  footer: {
    description:
      "The CRM & sales pipeline platform that helps B2B sales teams close more deals with less busywork.",
    columns: [
      { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog"] },
      { title: "Solutions", links: ["Sales teams", "RevOps", "SDR teams", "Startups"] },
      { title: "Resources", links: ["Documentation", "Blog", "Sales guides", "Status"] },
      { title: "Company", links: ["About", "Careers", "Contact", "Privacy"] },
    ],
  },
};
