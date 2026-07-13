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
    name: "NeuralWorks",
    tagline: "AI workflow automation for operations teams",
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
    badge: "Now with multi-agent orchestration",
    title: "Automate the busywork",
    highlight: "with AI agents",
    subtitle:
      "NeuralWorks lets operations teams build AI-powered workflows on a visual canvas — connecting every app, with human approval exactly where it matters.",
    primaryCta: "Start free trial",
    secondaryCta: "Book a demo",
    note: "14-day free trial · No credit card required",
    metrics: [
      { label: "Workflows automated", value: "34,500", change: "+28% vs last month" },
      { label: "Hours saved weekly", value: "18 hrs", change: "+6 hrs per team" },
      { label: "AI-handled tasks", value: "2.4M/mo", change: "+41% this quarter" },
    ],
  },

  logos: ["Lumio", "Cascade", "Driftwell", "Axon Health", "Pioneer Freight", "Halcyon Retail"],

  features: {
    title: "From trigger to outcome — no code required",
    subtitle:
      "Design, deploy, and monitor automations that actually think, on a canvas your ops team already understands.",
    items: [
      {
        icon: "Workflow",
        title: "Visual workflow builder",
        description:
          "Drag triggers, conditions, and actions onto a canvas. Branch logic, loops, and error handling — without writing a single line of code.",
      },
      {
        icon: "Bot",
        title: "AI agents that act",
        description:
          "Drop agents into any step to classify tickets, extract data from documents, draft responses, or decide the next best action.",
      },
      {
        icon: "Layers",
        title: "400+ app integrations",
        description:
          "Slack, Salesforce, Shopify, Jira, Google Workspace, and hundreds more — pre-built connectors with managed authentication.",
      },
      {
        icon: "Users",
        title: "Human-in-the-loop approvals",
        description:
          "Route high-stakes decisions to a person with full context. Approvers review, edit, and approve right from Slack or email.",
      },
      {
        icon: "Zap",
        title: "Triggers & webhooks",
        description:
          "Start workflows from schedules, app events, form submissions, or inbound webhooks — and expose any workflow as an API endpoint.",
      },
      {
        icon: "Gauge",
        title: "Run analytics & monitoring",
        description:
          "See every execution, success rate, and bottleneck. Get alerted when a workflow fails, and replay any run with one click.",
      },
    ],
  },

  stats: [
    { value: "120M+", label: "Workflow runs monthly" },
    { value: "99.95%", label: "Uptime SLA" },
    { value: "4.9/5", label: "Average customer rating" },
    { value: "3,200+", label: "Operations teams onboard" },
  ],

  testimonials: {
    title: "Built for operations teams that move fast",
    subtitle: "From logistics to healthcare — here's what customers say.",
    items: [
      {
        quote:
          "Our ops team automated invoice matching and vendor onboarding in a week. We reclaimed 22 hours a month on day one.",
        author: "Rachel Boone",
        role: "Director of Operations",
        company: "Pioneer Freight",
      },
      {
        quote:
          "The human-in-the-loop approvals were the unlock. Legal finally signed off on AI handling patient intake documents.",
        author: "Dr. Samir Patel",
        role: "Chief Digital Officer",
        company: "Axon Health",
      },
      {
        quote:
          "We replaced three point tools and a fragile pile of scripts. NeuralWorks is now the nervous system of our back office.",
        author: "Leah Forsythe",
        role: "VP of Revenue Operations",
        company: "Cascade",
      },
    ],
  },

  pricing: {
    title: "Pricing that grows with your automations",
    subtitle: "Start with one workflow, scale to your entire back office. Cancel anytime.",
    tiers: [
      {
        name: "Starter",
        price: "$29",
        period: "/month",
        description: "For individuals and small teams automating their first processes.",
        features: [
          "5 active workflows",
          "2,000 runs / month",
          "Visual builder & 100+ integrations",
          "Community templates",
          "Email support",
        ],
        cta: "Start free trial",
      },
      {
        name: "Pro",
        price: "$99",
        period: "/month",
        description: "For operations teams putting AI agents into production.",
        features: [
          "Unlimited workflows",
          "50,000 runs / month",
          "AI agents & human-in-the-loop approvals",
          "400+ integrations & webhooks",
          "Run analytics & alerting",
          "Priority support",
        ],
        cta: "Start free trial",
        highlighted: true,
      },
      {
        name: "Enterprise",
        price: "Custom",
        period: "",
        description: "For organizations with scale, governance, and security needs.",
        features: [
          "Custom run volumes & rate limits",
          "Self-hosted or VPC deployment",
          "SSO, SCIM & audit logs",
          "SOC 2 Type II & GDPR",
          "Dedicated solutions engineer",
          "99.95% uptime SLA",
        ],
        cta: "Contact sales",
      },
    ],
  },

  faq: {
    title: "Frequently asked questions",
    items: [
      {
        question: "Do I need to know how to code?",
        answer:
          "No. The visual builder covers branching, loops, and error handling without code — but developers can drop in custom functions or call any API when they need more control.",
      },
      {
        question: "Which AI models power the agents?",
        answer:
          "NeuralWorks is model-agnostic. Use our managed models out of the box, or bring your own OpenAI, Anthropic, or self-hosted endpoints — per workflow.",
      },
      {
        question: "What counts as a 'run'?",
        answer:
          "One run is a single end-to-end execution of a workflow, regardless of how many steps or agents it contains. Loops and retries within a run don't count extra.",
      },
      {
        question: "How do approvals work in practice?",
        answer:
          "Add an approval step anywhere in a workflow. The designated approver gets a Slack message or email with the AI's output and full context — approve, edit, or reject in one tap.",
      },
      {
        question: "Is my data used to train AI models?",
        answer:
          "Never. Your workflow data is processed transiently and is never used for model training. Enterprise plans can route all AI calls through your own infrastructure.",
      },
      {
        question: "Can I migrate from Zapier or Make?",
        answer:
          "Yes. Our import tool converts Zapier Zaps and Make scenarios into NeuralWorks workflows, and our team offers free migration assistance on Pro plans.",
      },
    ],
  },

  cta: {
    title: "Put your busywork on autopilot this week",
    subtitle:
      "Join 3,200+ operations teams who automated their back office with NeuralWorks.",
    button: "Start your 14-day free trial",
  },

  footer: {
    description:
      "AI workflow automation that connects every app and puts agents to work — with humans approving what matters.",
    columns: [
      { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog"] },
      { title: "Solutions", links: ["Operations", "Finance ops", "Support ops", "Revenue ops"] },
      { title: "Resources", links: ["Documentation", "Templates", "Blog", "Status"] },
      { title: "Company", links: ["About", "Careers", "Contact", "Privacy"] },
    ],
  },
};
