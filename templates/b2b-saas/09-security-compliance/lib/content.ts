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
    name: "ShieldOps",
    tagline: "Security & compliance for IT teams",
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
    badge: "SOC 2 Type II certified",
    title: "Enterprise-grade security",
    highlight: "without the complexity",
    subtitle:
      "ShieldOps unifies threat detection, compliance automation, and access reviews in one platform — so your security team can protect everything without drowning in alerts.",
    primaryCta: "Start free trial",
    secondaryCta: "Book a demo",
    note: "30-day free trial · Deploys in under an hour",
    metrics: [
      { label: "Threats blocked", value: "1.2M", change: "+18% this quarter" },
      { label: "Compliance score", value: "98.2%", change: "+4.1 pts vs last audit" },
      { label: "Audit hours saved", value: "320/mo", change: "+45% vs manual" },
    ],
  },

  logos: ["Meridian Bank", "Atlas Health", "Cinder Analytics", "Granite Labs", "ForgeStack", "Northlight Energy"],

  features: {
    title: "Security operations, automated end to end",
    subtitle:
      "Detect, respond, and prove compliance — from a single console your whole IT team can run.",
    items: [
      {
        icon: "Shield",
        title: "Threat detection",
        description:
          "Continuous monitoring across cloud, endpoints, and SaaS apps. ShieldOps correlates signals and surfaces real threats — not alert noise.",
      },
      {
        icon: "FileText",
        title: "Compliance automation",
        description:
          "Map controls to SOC 2, ISO 27001, HIPAA, and GDPR once, then let ShieldOps collect evidence and track gaps continuously.",
      },
      {
        icon: "Users",
        title: "Access reviews",
        description:
          "Run quarterly access reviews in hours, not weeks. See who has access to what, flag stale permissions, and revoke with one click.",
      },
      {
        icon: "Lock",
        title: "Immutable audit logs",
        description:
          "Every action, login, and configuration change is written to tamper-proof logs — ready for auditors and incident response alike.",
      },
      {
        icon: "Search",
        title: "Vulnerability scanning",
        description:
          "Scan infrastructure and code dependencies on every deploy, with severity scoring and auto-created remediation tickets.",
      },
      {
        icon: "Bell",
        title: "Smart alerting",
        description:
          "Route incidents to Slack, PagerDuty, or email with context attached — who, what, where, and the recommended next step.",
      },
    ],
  },

  stats: [
    { value: "40B+", label: "Security events analyzed monthly" },
    { value: "99.99%", label: "Uptime SLA" },
    { value: "12", label: "Compliance frameworks supported" },
    { value: "800+", label: "Security teams onboard" },
  ],

  testimonials: {
    title: "Trusted by security and IT leaders",
    subtitle: "From regulated fintechs to healthcare providers — here's what customers say.",
    items: [
      {
        quote:
          "We passed our first SOC 2 Type II audit in four months instead of a year. ShieldOps collected 90% of the evidence automatically.",
        author: "Elena Vasquez",
        role: "CISO",
        company: "Meridian Bank",
      },
      {
        quote:
          "Alert fatigue was burning out my team. ShieldOps cut noise by 70% and the incidents that remain are the ones that actually matter.",
        author: "Greg Okonkwo",
        role: "Director of IT Security",
        company: "Atlas Health",
      },
      {
        quote:
          "Access reviews used to take three engineers two weeks every quarter. Now it's a one-click report and a two-hour meeting.",
        author: "Ingrid Holm",
        role: "VP of Engineering",
        company: "Cinder Analytics",
      },
    ],
  },

  pricing: {
    title: "Pricing built for security budgets",
    subtitle: "Flat platform pricing — no per-event overage surprises. Every plan includes onboarding.",
    tiers: [
      {
        name: "Starter",
        price: "$99",
        period: "/month",
        description: "For small IT teams establishing their security baseline.",
        features: [
          "Up to 100 assets monitored",
          "Threat detection & smart alerting",
          "1 compliance framework",
          "30-day audit log retention",
          "Email support",
        ],
        cta: "Start free trial",
      },
      {
        name: "Business",
        price: "$299",
        period: "/month",
        description: "For growing companies facing audits and stricter requirements.",
        features: [
          "Up to 1,000 assets monitored",
          "Compliance automation (SOC 2, ISO, HIPAA)",
          "Access reviews & permission reports",
          "Vulnerability scanning",
          "1-year audit log retention",
          "Priority support",
        ],
        cta: "Start free trial",
        highlighted: true,
      },
      {
        name: "Enterprise",
        price: "Custom",
        period: "",
        description: "For organizations with advanced scale and regulatory needs.",
        features: [
          "Unlimited assets & frameworks",
          "Custom detection rules & playbooks",
          "SSO, SCIM & role-based access",
          "Immutable audit logs, 7-year retention",
          "Dedicated security success manager",
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
        question: "How long does deployment take?",
        answer:
          "Most teams connect their cloud accounts, identity provider, and SaaS apps in under an hour using read-only API integrations — no agents required to start.",
      },
      {
        question: "Which compliance frameworks do you support?",
        answer:
          "SOC 2 Type I & II, ISO 27001, HIPAA, GDPR, PCI DSS, NIST CSF, and more. You can also define custom frameworks for industry-specific requirements.",
      },
      {
        question: "Do you store our log data, and where?",
        answer:
          "Yes, encrypted at rest and in transit. You choose US or EU data residency, and retention is configurable from 30 days to 7 years depending on plan.",
      },
      {
        question: "Can ShieldOps replace our SIEM?",
        answer:
          "For many mid-market teams, yes. Larger enterprises typically use ShieldOps alongside an existing SIEM — we stream correlated alerts and audit data both ways.",
      },
      {
        question: "What happens during a security incident?",
        answer:
          "ShieldOps opens an incident timeline automatically, correlates related events, and suggests containment steps. Post-incident, you get an auditor-ready report.",
      },
      {
        question: "Is ShieldOps itself compliant and certified?",
        answer:
          "Yes. We're SOC 2 Type II certified, GDPR compliant, and undergo annual penetration testing. Our trust center is available to prospects under NDA.",
      },
    ],
  },

  cta: {
    title: "Close your security gaps before auditors — or attackers — find them",
    subtitle:
      "Join 800+ security teams who run detection, compliance, and access reviews on ShieldOps.",
    button: "Start your 30-day free trial",
  },

  footer: {
    description:
      "Security and compliance operations that detect threats, automate evidence collection, and keep audits painless.",
    columns: [
      { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog"] },
      { title: "Solutions", links: ["Fintech", "Healthcare", "SaaS", "Public sector"] },
      { title: "Resources", links: ["Documentation", "Trust center", "Guides", "Status"] },
      { title: "Company", links: ["About", "Careers", "Contact", "Privacy"] },
    ],
  },
};
