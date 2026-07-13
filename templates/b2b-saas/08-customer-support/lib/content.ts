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
    name: "SupportDesk",
    tagline: "Helpdesk software for support teams",
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
    badge: "New: AI answer drafting for every ticket",
    title: "Resolve tickets faster,",
    highlight: "keep customers happy",
    subtitle:
      "SupportDesk brings every conversation — email, chat, and social — into one shared inbox with SLAs, automation, and a knowledge base customers actually use.",
    primaryCta: "Start free trial",
    secondaryCta: "Book a demo",
    note: "14-day free trial · No credit card required",
    metrics: [
      { label: "Tickets resolved", value: "8,412", change: "+22% vs last month" },
      { label: "First response", value: "1m 48s", change: "-35% vs last quarter" },
      { label: "CSAT score", value: "4.8/5", change: "+0.3 pts this month" },
    ],
  },

  logos: ["LumenCart", "SwiftShip", "Vantage Health", "Cobalt Finance", "Trellis", "Skylark"],

  features: {
    title: "One workspace for every customer conversation",
    subtitle:
      "From the first chat bubble to the five-star survey — everything your support team needs in a single inbox.",
    items: [
      {
        icon: "MessageSquare",
        title: "Shared inbox",
        description:
          "Email, live chat, and social DMs land in one queue with collision detection, so two agents never answer the same customer twice.",
      },
      {
        icon: "Bot",
        title: "AI reply drafts",
        description:
          "SupportDesk AI drafts on-brand answers from your knowledge base and past tickets — agents just review and send.",
      },
      {
        icon: "Bell",
        title: "SLA tracking",
        description:
          "Set response and resolution targets per plan or customer tier. Breaches escalate automatically before they become complaints.",
      },
      {
        icon: "FileText",
        title: "Knowledge base",
        description:
          "Publish a branded help center in minutes. Articles surface inside the inbox so agents can attach answers in one click.",
      },
      {
        icon: "Globe",
        title: "Live chat widget",
        description:
          "Add proactive chat to your site with canned responses, file sharing, and offline capture that becomes a ticket overnight.",
      },
      {
        icon: "Gauge",
        title: "CSAT & reporting",
        description:
          "Track CSAT, first-response time, and backlog by agent, tag, or channel — with dashboards your VP can actually read.",
      },
    ],
  },

  stats: [
    { value: "2.1M+", label: "Tickets resolved monthly" },
    { value: "99.98%", label: "Uptime SLA" },
    { value: "4.8/5", label: "Average customer CSAT" },
    { value: "1,500+", label: "Support teams onboard" },
  ],

  testimonials: {
    title: "Trusted by support teams everywhere",
    subtitle: "From ecommerce startups to fintech scale-ups — here's what customers say.",
    items: [
      {
        quote:
          "We consolidated three tools into SupportDesk and cut our first-response time in half during our busiest holiday season.",
        author: "Dana Whitfield",
        role: "Head of Support",
        company: "LumenCart",
      },
      {
        quote:
          "The SLA rules gave us eyes on enterprise accounts we were quietly disappointing. Renewals are up 14% since.",
        author: "Omar Haddad",
        role: "VP of Customer Experience",
        company: "SwiftShip",
      },
      {
        quote:
          "AI drafts handle about 40% of our tier-1 tickets. My team now spends their time on the conversations that actually need a human.",
        author: "Yuki Tanabe",
        role: "Support Operations Lead",
        company: "Vantage Health",
      },
    ],
  },

  pricing: {
    title: "Pricing that scales with your team",
    subtitle: "Pay per agent, cancel anytime. Every plan starts with a 14-day free trial.",
    tiers: [
      {
        name: "Starter",
        price: "$19",
        period: "/agent/mo",
        description: "For small teams centralizing support for the first time.",
        features: [
          "Shared email inbox",
          "Live chat widget",
          "Basic macros & canned replies",
          "Branded knowledge base",
          "Email support",
        ],
        cta: "Start free trial",
      },
      {
        name: "Team",
        price: "$49",
        period: "/agent/mo",
        description: "For growing teams that need automation and accountability.",
        features: [
          "Everything in Starter",
          "AI reply drafts & ticket summaries",
          "SLA rules & escalations",
          "CSAT surveys & reporting",
          "Social channels (X, Instagram)",
          "Priority support",
        ],
        cta: "Start free trial",
        highlighted: true,
      },
      {
        name: "Enterprise",
        price: "Custom",
        period: "",
        description: "For high-volume teams with security and compliance needs.",
        features: [
          "Unlimited channels & agents",
          "Custom roles & permission sets",
          "SSO, SCIM & audit logs",
          "SOC 2 Type II & GDPR",
          "Dedicated success manager",
          "99.98% uptime SLA",
        ],
        cta: "Contact sales",
      },
    ],
  },

  faq: {
    title: "Frequently asked questions",
    items: [
      {
        question: "How long does it take to migrate our existing inbox?",
        answer:
          "Most teams are live in a day. Connect Gmail or Outlook, import your contact history, and forward your support address — our migration checklist walks you through it.",
      },
      {
        question: "Can we keep our existing help center articles?",
        answer:
          "Yes. One-click importers pull articles from Zendesk, Intercom, and Help Scout, preserving categories, images, and slugs.",
      },
      {
        question: "How does the AI learn our tone and policies?",
        answer:
          "SupportDesk AI trains on your knowledge base and past resolved tickets. Drafts cite their sources, and every suggestion is approved by an agent before sending.",
      },
      {
        question: "Do you charge for chatbot or AI usage separately?",
        answer:
          "No hidden usage fees. AI drafting is included on Team and Enterprise plans with generous monthly limits sized for typical ticket volumes.",
      },
      {
        question: "Can agents work in multiple languages?",
        answer:
          "Yes — the inbox auto-detects 40+ languages and translates threads inline, so one team can support a global customer base.",
      },
      {
        question: "Do you offer discounts for startups or nonprofits?",
        answer:
          "Yes — eligible startups get 50% off the Team plan for their first year, and registered nonprofits always get 40% off. Reach out to sales to apply.",
      },
    ],
  },

  cta: {
    title: "Give your customers answers in minutes, not days",
    subtitle:
      "Join 1,500+ support teams who traded chaos for a calm, organized inbox.",
    button: "Start your 14-day free trial",
  },

  footer: {
    description:
      "Helpdesk software that resolves tickets faster and keeps customers happy — for support, success, and operations teams.",
    columns: [
      { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog"] },
      { title: "Solutions", links: ["Ecommerce", "SaaS", "Healthcare", "Financial services"] },
      { title: "Resources", links: ["Documentation", "Blog", "Help center", "Status"] },
      { title: "Company", links: ["About", "Careers", "Contact", "Privacy"] },
    ],
  },
};
