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
    name: "BrightWave",
    tagline: "Marketing automation for growth teams",
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
    badge: "New: visual journey builder",
    title: "Turn visitors into customers",
    highlight: "on autopilot",
    subtitle:
      "BrightWave gives growth teams email campaigns, lead scoring, and customer journeys that run themselves — so pipeline grows while you sleep.",
    primaryCta: "Start free trial",
    secondaryCta: "Book a demo",
    note: "14-day free trial · No credit card required",
    metrics: [
      { label: "Leads captured", value: "24,516", change: "+31% vs last month" },
      { label: "Email open rate", value: "42%", change: "+5 pts this quarter" },
      { label: "Pipeline influenced", value: "$1.8M", change: "+24% vs last quarter" },
    ],
  },

  logos: ["Sunberry", "Crestview", "Petal & Stem", "Vaultline", "Foxglove", "Harborly"],

  features: {
    title: "Everything you need to grow on autopilot",
    subtitle:
      "Capture, nurture, and convert — one platform for campaigns, scoring, and journeys that never sleeps.",
    items: [
      {
        icon: "Mail",
        title: "Email campaigns",
        description:
          "Design beautiful, responsive emails with a drag-and-drop editor, then send at each contact's optimal time with smart scheduling.",
      },
      {
        icon: "Target",
        title: "Lead scoring",
        description:
          "Score every lead on behavior and fit, and route hot prospects to sales the moment they cross your threshold.",
      },
      {
        icon: "Workflow",
        title: "Visual journeys",
        description:
          "Build multi-step nurture journeys with branches, delays, and triggers — onboarding, re-engagement, and upsell flows in minutes.",
      },
      {
        icon: "Zap",
        title: "A/B testing",
        description:
          "Test subject lines, content, and send times on any step. Winners roll out automatically once results are significant.",
      },
      {
        icon: "Filter",
        title: "Smart segmentation",
        description:
          "Build dynamic audiences from any behavior or attribute. Segments update in real time as contacts act — no CSV exports.",
      },
      {
        icon: "BarChart3",
        title: "Revenue attribution",
        description:
          "See which campaigns and journeys actually drive pipeline and closed-won revenue — not just opens and clicks.",
      },
    ],
  },

  stats: [
    { value: "3.2x", label: "Average ROI in year one" },
    { value: "900M+", label: "Emails delivered monthly" },
    { value: "4.9/5", label: "Average customer rating" },
    { value: "4,200+", label: "Growth teams onboard" },
  ],

  testimonials: {
    title: "Loved by growth teams everywhere",
    subtitle: "From first hire to full demand-gen org — here's what customers say.",
    items: [
      {
        quote:
          "Our welcome journey now converts 2.4x better than the drip we hand-built in our old tool — and it took an afternoon to set up.",
        author: "Natalie Brooks",
        role: "Head of Growth",
        company: "Sunberry",
      },
      {
        quote:
          "Lead scoring changed our relationship with sales overnight. They finally trust marketing's MQLs because the close rates prove it.",
        author: "Greg Hamilton",
        role: "Director of Demand Generation",
        company: "Crestview",
      },
      {
        quote:
          "We attribute $600K of pipeline to BrightWave journeys last quarter. For the first time, I can defend our budget with revenue, not vanity metrics.",
        author: "Julia Fernandez",
        role: "VP of Marketing",
        company: "Petal & Stem",
      },
    ],
  },

  pricing: {
    title: "Pricing that grows with your list",
    subtitle: "Based on contacts, not seats. Every plan includes unlimited users.",
    tiers: [
      {
        name: "Starter",
        price: "$39",
        period: "/month",
        description: "For small teams launching their first automated campaigns.",
        features: [
          "Up to 2,500 contacts",
          "Unlimited email sends",
          "Drag-and-drop email builder",
          "Basic segmentation",
          "Email support",
        ],
        cta: "Start free trial",
      },
      {
        name: "Growth",
        price: "$99",
        period: "/month",
        description: "For scaling teams that need journeys, scoring, and testing.",
        features: [
          "Up to 25,000 contacts",
          "Visual journey builder",
          "Lead scoring & routing",
          "A/B testing",
          "Revenue attribution reports",
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
          "Unlimited contacts",
          "Dedicated IP & deliverability suite",
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
        question: "How does contact-based pricing work?",
        answer:
          "You pay for the number of active contacts in your account — not seats or sends. Every plan includes unlimited users and unlimited email sends within fair use.",
      },
      {
        question: "Can I migrate from Mailchimp, HubSpot, or Marketo?",
        answer:
          "Yes. Import contacts, segments, templates, and engagement history with our migration wizard. On Growth and Enterprise, our team handles the whole move for you.",
      },
      {
        question: "How do you protect deliverability?",
        answer:
          "We manage authentication (SPF, DKIM, DMARC), monitor sender reputation, and suppress bounces and unsubscribes automatically — keeping your emails in the inbox.",
      },
      {
        question: "Does BrightWave integrate with my CRM?",
        answer:
          "Two-way sync with Salesforce, HubSpot, and Pipedrive is built in, plus webhooks and a full API for anything custom. Scores and journey activity write back to the CRM automatically.",
      },
      {
        question: "Is BrightWave GDPR and CAN-SPAM compliant?",
        answer:
          "Yes. Consent management, double opt-in, one-click unsubscribe, and EU data residency are included on all plans, with DPA signing available.",
      },
      {
        question: "What happens if my list outgrows my plan?",
        answer:
          "We'll notify you at 80% of your contact limit. Upgrade in one click — we never stop sending or delete contacts without warning.",
      },
    ],
  },

  cta: {
    title: "Put your growth on autopilot",
    subtitle:
      "Join 4,200+ growth teams turning visitors into customers with BrightWave.",
    button: "Start your 14-day free trial",
  },

  footer: {
    description:
      "Marketing automation that helps growth teams turn visitors into customers — campaigns, scoring, and journeys on autopilot.",
    columns: [
      { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog"] },
      { title: "Solutions", links: ["Growth teams", "Demand gen", "Lifecycle", "Startups"] },
      { title: "Resources", links: ["Documentation", "Blog", "Playbooks", "Status"] },
      { title: "Company", links: ["About", "Careers", "Contact", "Privacy"] },
    ],
  },
};
