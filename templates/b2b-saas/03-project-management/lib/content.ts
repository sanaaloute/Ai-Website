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
    name: "TaskPilot",
    tagline: "Project management for product & engineering teams",
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
    badge: "New: sprint automations 2.0",
    title: "Plan, track, and ship work",
    highlight: "in one place",
    subtitle:
      "TaskPilot brings boards, sprints, roadmaps, and automations together so product and engineering teams ship faster — with fewer status meetings.",
    primaryCta: "Start free trial",
    secondaryCta: "Book a demo",
    note: "Free for up to 10 users · No credit card required",
    metrics: [
      { label: "Tasks completed", value: "12,847", change: "+22% vs last sprint" },
      { label: "Projects on time", value: "94%", change: "+6 pts this quarter" },
      { label: "Team velocity", value: "38 pts", change: "+15% vs last sprint" },
    ],
  },

  logos: ["Driftwood", "Kestrel", "Mapleline", "Orbit Nine", "Sandstone", "Tidewell"],

  features: {
    title: "Everything your team needs to ship on time",
    subtitle:
      "One workspace for planning, tracking, and delivering — from the first idea to the release notes.",
    items: [
      {
        icon: "Layers",
        title: "Flexible boards",
        description:
          "Kanban, list, or timeline — every team works the way it wants, on the same data. Group and filter by assignee, label, or priority.",
      },
      {
        icon: "Repeat",
        title: "Sprint planning",
        description:
          "Plan sprints with capacity tracking and velocity charts, then roll unfinished work forward automatically when the sprint closes.",
      },
      {
        icon: "Target",
        title: "Product roadmaps",
        description:
          "Connect daily tasks to quarterly goals on a shareable roadmap, so stakeholders always know what's shipping and when.",
      },
      {
        icon: "Workflow",
        title: "Powerful automations",
        description:
          "Auto-assign reviewers, move cards on status change, and notify Slack when blockers appear — hundreds of rules, zero code.",
      },
      {
        icon: "Code",
        title: "Git integrations",
        description:
          "Link branches, commits, and pull requests to tasks. Close issues automatically when code merges to main.",
      },
      {
        icon: "BarChart3",
        title: "Real-time reports",
        description:
          "Burndown, cumulative flow, and cycle-time charts update live, so standups become five minutes of facts instead of opinions.",
      },
    ],
  },

  stats: [
    { value: "35%", label: "Faster release cycles" },
    { value: "2M+", label: "Tasks completed monthly" },
    { value: "4.8/5", label: "Average customer rating" },
    { value: "6,000+", label: "Product teams onboard" },
  ],

  testimonials: {
    title: "Loved by product & engineering teams",
    subtitle: "From two-person startups to platform orgs — here's what customers say.",
    items: [
      {
        quote:
          "We killed three status meetings a week. The roadmap view gives leadership everything they need without interrupting the team.",
        author: "Rachel Kim",
        role: "VP of Engineering",
        company: "Driftwood",
      },
      {
        quote:
          "Sprint planning went from a painful half-day to 45 minutes. Capacity tracking means we finally stop overcommitting every sprint.",
        author: "Tom Becker",
        role: "Engineering Manager",
        company: "Kestrel",
      },
      {
        quote:
          "The Git integration alone is worth it. Tasks close themselves when PRs merge, and our board is always actually up to date.",
        author: "Aisha Patel",
        role: "Head of Product",
        company: "Mapleline",
      },
    ],
  },

  pricing: {
    title: "Simple pricing for every team size",
    subtitle: "Per-seat pricing, billed monthly or annually. Free forever for small teams.",
    tiers: [
      {
        name: "Starter",
        price: "$0",
        period: "/user/mo",
        description: "For small teams getting organized — free up to 10 users.",
        features: [
          "Up to 10 users",
          "Unlimited tasks & boards",
          "Basic sprint planning",
          "2 automations per board",
          "Community support",
        ],
        cta: "Start for free",
      },
      {
        name: "Team",
        price: "$9",
        period: "/user/mo",
        description: "For growing teams that need roadmaps and automation.",
        features: [
          "Unlimited users",
          "Sprints with capacity & velocity",
          "Product roadmaps",
          "Unlimited automations",
          "Git & Slack integrations",
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
          "Unlimited everything",
          "Advanced permissions & guest roles",
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
        question: "Is the Starter plan really free?",
        answer:
          "Yes — teams of up to 10 users get unlimited tasks, boards, and docs at no cost, forever. Upgrade only when you need sprints, roadmaps, or automations.",
      },
      {
        question: "Can I import from Jira, Asana, or Trello?",
        answer:
          "Absolutely. Our importers bring over projects, tasks, assignees, labels, comments, and attachments in minutes — with a preview before anything changes.",
      },
      {
        question: "Does TaskPilot work for non-engineering teams?",
        answer:
          "Yes. Marketing, design, and ops teams use the same boards and automations. Templates for launches, content calendars, and hiring pipelines are built in.",
      },
      {
        question: "How do automations work?",
        answer:
          "Pick a trigger (status change, due date, label) and an action (assign, move, notify). Rules run instantly and you can see a full activity log of everything they do.",
      },
      {
        question: "Is my data secure?",
        answer:
          "All data is encrypted in transit and at rest. Team and Enterprise plans include role-based permissions, and Enterprise adds SSO, SCIM, and audit logs.",
      },
      {
        question: "Do you offer discounts for startups or nonprofits?",
        answer:
          "Yes — eligible early-stage startups and nonprofits get 50% off the Team plan. Reach out to sales with your details to apply.",
      },
    ],
  },

  cta: {
    title: "Start shipping with TaskPilot today",
    subtitle:
      "Join 6,000+ product and engineering teams that plan, track, and ship work in one place.",
    button: "Start your free workspace",
  },

  footer: {
    description:
      "Project management that helps product and engineering teams plan, track, and ship work in one place.",
    columns: [
      { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog"] },
      { title: "Solutions", links: ["Engineering", "Product teams", "Design", "Startups"] },
      { title: "Resources", links: ["Documentation", "Blog", "Templates", "Status"] },
      { title: "Company", links: ["About", "Careers", "Contact", "Privacy"] },
    ],
  },
};
