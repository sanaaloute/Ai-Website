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
    name: "PeopleHub",
    tagline: "HR & people operations for growing companies",
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
    badge: "Loved by 500+ people teams",
    title: "Run HR without",
    highlight: "the paperwork",
    subtitle:
      "PeopleHub brings onboarding, time off, performance reviews, payroll sync, and org charts into one simple platform — so your people team spends time on people, not spreadsheets.",
    primaryCta: "Start free trial",
    secondaryCta: "Book a demo",
    note: "14-day free trial · No credit card required",
    metrics: [
      { label: "Employees managed", value: "85,000+", change: "+14% this year" },
      { label: "Avg. onboarding time", value: "3 days", change: "-5 days vs industry avg" },
      { label: "HR hours saved", value: "22h/wk", change: "+6h since last quarter" },
    ],
  },

  logos: ["Kindred", "Sapling", "Vantage", "Orbit Retail", "Pebblebrook", "Clearstone"],

  features: {
    title: "Everything your people team needs in one place",
    subtitle:
      "From a new hire's first day to their next promotion — one platform for the entire employee lifecycle.",
    items: [
      {
        icon: "Rocket",
        title: "Effortless onboarding",
        description:
          "Build repeatable onboarding checklists that assign tasks, collect documents, and order equipment automatically — new hires are productive from day one.",
      },
      {
        icon: "Calendar",
        title: "Time off & PTO tracking",
        description:
          "Employees request leave in two clicks and managers approve it from Slack. Balances, accruals, and holidays sync to everyone's calendar automatically.",
      },
      {
        icon: "Award",
        title: "Performance reviews",
        description:
          "Run 360° reviews, goal cycles, and calibration sessions with templates that take minutes to launch — and results managers actually act on.",
      },
      {
        icon: "CreditCard",
        title: "Payroll sync",
        description:
          "Two-way sync with Gusto, ADP, and Deel keeps salary, role, and bank details accurate — no more double entry before every pay run.",
      },
      {
        icon: "Users",
        title: "Interactive org charts",
        description:
          "Visualize reporting lines that update themselves as people join, move, or leave. Share live org charts with leadership in one link.",
      },
      {
        icon: "FileText",
        title: "Documents & e-signatures",
        description:
          "Store contracts, policies, and handbooks in one secure vault. Send offer letters for e-signature and get automatic reminders until they're signed.",
      },
    ],
  },

  stats: [
    { value: "500+", label: "Companies onboard" },
    { value: "85,000+", label: "Employees managed" },
    { value: "40%", label: "Less time on HR admin" },
    { value: "4.8/5", label: "Average customer rating" },
  ],

  testimonials: {
    title: "Loved by people-first companies",
    subtitle: "From 20-person startups to 2,000-person scaleups — here's what HR leaders say.",
    items: [
      {
        quote:
          "Onboarding used to mean a 40-row spreadsheet and a prayer. With PeopleHub, every new hire gets the same great first week — even when we're hiring ten at once.",
        author: "Hannah Whitmore",
        role: "VP of People",
        company: "Kindred",
      },
      {
        quote:
          "We cut the time our managers spend chasing PTO approvals and review forms by half. The payroll sync alone saved us from two costly mistakes in the first month.",
        author: "Raj Patel",
        role: "HR Director",
        company: "Vantage",
      },
      {
        quote:
          "I rolled out performance reviews to 600 employees in an afternoon. Participation hit 96% — we've never seen anything close to that with our old process.",
        author: "Emily Tran",
        role: "Chief People Officer",
        company: "Pebblebrook",
      },
    ],
  },

  pricing: {
    title: "Pricing that grows with your team",
    subtitle: "Per-employee pricing with no setup fees. Cancel anytime.",
    tiers: [
      {
        name: "Core",
        price: "$6",
        period: "/employee/month",
        description: "For small teams centralizing their HR basics.",
        features: [
          "Employee records & org chart",
          "Time-off tracking & approvals",
          "Onboarding checklists",
          "Secure document storage",
          "Email support",
        ],
        cta: "Start free trial",
      },
      {
        name: "Grow",
        price: "$11",
        period: "/employee/month",
        description: "For growing companies automating the employee lifecycle.",
        features: [
          "Everything in Core",
          "Performance reviews & goals",
          "Payroll sync (Gusto, ADP, Deel)",
          "E-signatures & offer letters",
          "People analytics & reports",
          "Priority support",
        ],
        cta: "Start free trial",
        highlighted: true,
      },
      {
        name: "Enterprise",
        price: "Custom",
        period: "",
        description: "For organizations with security and compliance needs.",
        features: [
          "Everything in Grow",
          "SSO & SCIM provisioning",
          "Advanced permissions & audit logs",
          "SOC 2 Type II & GDPR",
          "Custom integrations & API access",
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
        question: "How long does it take to get set up?",
        answer:
          "Most companies import their employee data and go live the same day. Our onboarding specialists help larger teams migrate in under a week.",
      },
      {
        question: "Which payroll providers do you integrate with?",
        answer:
          "PeopleHub syncs two-way with Gusto, ADP, Deel, Paylocity, and Rippling. Salary changes, new hires, and terminations flow automatically — no double entry.",
      },
      {
        question: "Can employees use PeopleHub on mobile?",
        answer:
          "Yes. Employees can request time off, complete onboarding tasks, and sign documents from our iOS and Android apps — no desktop required.",
      },
      {
        question: "Is employee data secure?",
        answer:
          "All data is encrypted in transit and at rest, with role-based permissions so only the right people see sensitive records. We're SOC 2 Type II certified and GDPR compliant.",
      },
      {
        question: "Do you support companies in multiple countries?",
        answer:
          "Yes. Manage country-specific holiday calendars, leave policies, and currencies, with localized experiences for employees in 40+ countries.",
      },
      {
        question: "What happens if our headcount changes?",
        answer:
          "Billing adjusts automatically every month based on active employees — you're never charged for departed team members, and there are no long-term contracts on Core or Grow.",
      },
    ],
  },

  cta: {
    title: "Give your people team their time back",
    subtitle:
      "Join 500+ companies who run onboarding, reviews, and time off without the paperwork — all in PeopleHub.",
    button: "Start your 14-day free trial",
  },

  footer: {
    description:
      "HR and people operations software for growing companies — onboarding, time off, performance, and payroll sync in one platform.",
    columns: [
      { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog"] },
      { title: "Solutions", links: ["People ops", "HR teams", "Remote companies", "Startups"] },
      { title: "Resources", links: ["Documentation", "Blog", "Guides", "Status"] },
      { title: "Company", links: ["About", "Careers", "Contact", "Privacy"] },
    ],
  },
};
