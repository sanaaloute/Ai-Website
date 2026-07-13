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
    name: "UptimeCloud",
    tagline: "Monitoring & observability for DevOps teams",
  },

  nav: {
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Customers", href: "#testimonials" },
      { label: "FAQ", href: "#faq" },
    ],
    cta: "Start monitoring free",
  },

  hero: {
    badge: "Now with distributed tracing",
    title: "Know before your",
    highlight: "users do",
    subtitle:
      "UptimeCloud unifies uptime checks, logs, APM traces, on-call alerting, and status pages — so your SRE team catches every incident before customers tweet about it.",
    primaryCta: "Start monitoring free",
    secondaryCta: "Book a demo",
    note: "14-day free trial · No credit card required",
    metrics: [
      { label: "Uptime", value: "99.98%", change: "+0.02 pts this month" },
      { label: "Avg. response", value: "182ms", change: "-24ms vs last week" },
      { label: "Incidents resolved", value: "1,284", change: "+8% this quarter" },
    ],
  },

  logos: ["Stackline", "ForgeOps", "Railpoint", "Nimbus", "Keystone", "Driftwave"],

  features: {
    title: "Full-stack observability in one platform",
    subtitle:
      "From the edge to the database — everything your DevOps and SRE teams need to detect, triage, and resolve incidents fast.",
    items: [
      {
        icon: "Globe",
        title: "Global uptime checks",
        description:
          "Monitor HTTP, TCP, DNS, and SSL from 30+ locations with checks as frequent as every 30 seconds — and catch regional outages your users feel first.",
      },
      {
        icon: "LineChart",
        title: "APM & distributed traces",
        description:
          "Follow every request across microservices with automatic instrumentation for Node, Go, Python, and Java. Pinpoint the slow span in seconds.",
      },
      {
        icon: "Database",
        title: "Centralized log management",
        description:
          "Ship logs from any source and search billions of lines in under a second. Correlate log spikes with deploys and traces in one click.",
      },
      {
        icon: "Bell",
        title: "On-call alerting",
        description:
          "Route alerts to the right engineer with schedules, escalations, and multi-channel notifications — PagerDuty, Slack, SMS, and phone calls.",
      },
      {
        icon: "CheckCircle",
        title: "Hosted status pages",
        description:
          "Publish beautiful, branded status pages on your own domain and turn incidents into trust with proactive, real-time customer communication.",
      },
      {
        icon: "Workflow",
        title: "Incident workflows",
        description:
          "Auto-create incidents, assign responders, and post timelines to Slack. Runbooks and postmortem templates keep every post-incident review consistent.",
      },
    ],
  },

  stats: [
    { value: "12B+", label: "Checks run monthly" },
    { value: "99.99%", label: "Uptime SLA" },
    { value: "38s", label: "Median time to detect" },
    { value: "3,500+", label: "Engineering teams onboard" },
  ],

  testimonials: {
    title: "Trusted by reliability-obsessed teams",
    subtitle: "From fast-growing startups to global platforms — here's what engineers say.",
    items: [
      {
        quote:
          "UptimeCloud detected a fiber cut affecting one region three minutes before our first customer ticket. We rerouted traffic and nobody noticed.",
        author: "Dana Okafor",
        role: "Head of SRE",
        company: "Stackline",
      },
      {
        quote:
          "We replaced four tools — uptime, logs, APM, and status pages — with one platform. Our on-call engineers finally have a single pane of glass.",
        author: "Luis Fernandez",
        role: "VP of Engineering",
        company: "ForgeOps",
      },
      {
        quote:
          "The trace view cut our mean time to resolution from hours to minutes. We found a slow database query during the incident, not the next day.",
        author: "Aisha Malik",
        role: "Platform Lead",
        company: "Railpoint",
      },
    ],
  },

  pricing: {
    title: "Pricing that scales with your infrastructure",
    subtitle: "Start free, add capacity as you grow. No per-seat surprises.",
    tiers: [
      {
        name: "Starter",
        price: "$29",
        period: "/month",
        description: "For small teams that need reliable uptime monitoring.",
        features: [
          "Up to 50 monitors",
          "1-minute check intervals",
          "Email & Slack alerts",
          "1 hosted status page",
          "30-day log retention",
          "Email support",
        ],
        cta: "Start free trial",
      },
      {
        name: "Team",
        price: "$99",
        period: "/month",
        description: "For growing engineering teams running production systems.",
        features: [
          "Up to 500 monitors",
          "30-second check intervals",
          "APM traces & log search",
          "On-call rotations & escalations",
          "3 branded status pages",
          "90-day log retention",
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
          "Unlimited monitors",
          "Private monitoring locations",
          "SSO, SAML & audit logs",
          "SOC 2 Type II & HIPAA",
          "1-year log retention",
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
          "Most teams have their first monitors live in under five minutes. Add a URL for instant uptime checks, or install our one-line agent for APM and logs.",
      },
      {
        question: "Which alert channels do you support?",
        answer:
          "Email, Slack, Microsoft Teams, PagerDuty, Opsgenie, SMS, voice calls, and webhooks — with on-call schedules and automatic escalation policies.",
      },
      {
        question: "How do you prevent false-positive alerts?",
        answer:
          "Every check is confirmed from multiple locations before we alert, and you can require consecutive failures or custom thresholds before paging anyone.",
      },
      {
        question: "Can I migrate from Pingdom or Datadog?",
        answer:
          "Yes. Import your monitors, alert policies, and status page subscribers with our migration toolkit — most teams are fully switched over in an afternoon.",
      },
      {
        question: "Is UptimeCloud GDPR compliant?",
        answer:
          "Yes. We offer EU data residency, DPA signing, data-processing agreements, and full data deletion on request on all plans.",
      },
      {
        question: "Do you offer discounts for startups?",
        answer:
          "Yes — eligible early-stage startups get 50% off the Team plan for their first year. Reach out to sales to apply.",
      },
    ],
  },

  cta: {
    title: "Catch your next incident before your users do",
    subtitle:
      "Join 3,500+ engineering teams who trust UptimeCloud to keep their services fast, reliable, and transparent.",
    button: "Start your 14-day free trial",
  },

  footer: {
    description:
      "Monitoring and observability for DevOps and SRE teams — uptime checks, logs, traces, alerting, and status pages in one platform.",
    columns: [
      { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog"] },
      { title: "Solutions", links: ["DevOps teams", "SRE & platform", "E-commerce", "Startups"] },
      { title: "Resources", links: ["Documentation", "Blog", "Guides", "System status"] },
      { title: "Company", links: ["About", "Careers", "Contact", "Privacy"] },
    ],
  },
};
