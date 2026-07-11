import { TemplateSectorRow } from "./types";

export const SECTOR_ROWS: TemplateSectorRow[] = [
  {
    id: "sec_saas",
    slug: "saas",
    name: "B2B SaaS",
    description:
      "Dashboards, billing portals, and internal tools for recurring-revenue products.",
    background_image_url:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1600&q=80",
    sort_order: 10
  },
  {
    id: "sec_ecommerce",
    slug: "ecommerce",
    name: "E-commerce",
    description:
      "Storefronts, catalog UX, checkout flows, and merchant admin panels.",
    background_image_url:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1600&q=80",
    sort_order: 20
  },
  {
    id: "sec_fintech",
    slug: "fintech",
    name: "Fintech",
    description:
      "Wallets, spend insights, compliance-minded flows, and secure account areas.",
    background_image_url:
      "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1600&q=80",
    sort_order: 30
  },
  {
    id: "sec_healthcare",
    slug: "healthcare",
    name: "Healthcare",
    description:
      "Patient-friendly scheduling, intake forms, and clinician dashboards.",
    background_image_url:
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1600&q=80",
    sort_order: 40
  },
  {
    id: "sec_fitness",
    slug: "fitness",
    name: "Fitness & wellness",
    description:
      "Coaching sites, class bookings, habit trackers, and member portals.",
    background_image_url:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80",
    sort_order: 50
  },
  {
    id: "sec_education",
    slug: "education",
    name: "Education",
    description:
      "Course portals, cohort landing pages, and lightweight LMS-style UIs.",
    background_image_url:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1600&q=80",
    sort_order: 60
  },
  {
    id: "sec_real_estate",
    slug: "real-estate",
    name: "Real estate",
    description:
      "Listing galleries, agent profiles, and lead capture for property seekers.",
    background_image_url:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80",
    sort_order: 70
  },
  {
    id: "sec_creative",
    slug: "creative",
    name: "Creative & agencies",
    description:
      "Portfolio sites, case-study layouts, and pitch decks as web experiences.",
    background_image_url:
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1600&q=80",
    sort_order: 80
  },
  {
    id: "sec_hospitality",
    slug: "hospitality",
    name: "Hospitality & food",
    description:
      "Restaurants, cafés, hotels, reservations, and guest-facing menus.",
    background_image_url:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80",
    sort_order: 90
  },
  {
    id: "sec_travel",
    slug: "travel",
    name: "Travel & tourism",
    description:
      "Itineraries, booking flows, destination guides, and tour operators.",
    background_image_url:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=80",
    sort_order: 100
  },
  {
    id: "sec_hr",
    slug: "hr-recruiting",
    name: "HR & recruiting",
    description:
      "Job boards, applicant tracking, candidate profiles, and interview scheduling.",
    background_image_url:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&q=80",
    sort_order: 110
  },
  {
    id: "sec_legal",
    slug: "legal",
    name: "Legal & compliance",
    description:
      "Law firm sites, intake forms, practice areas, and secure client portals.",
    background_image_url:
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1600&q=80",
    sort_order: 120
  },
  {
    id: "sec_nonprofit",
    slug: "nonprofit",
    name: "Non-profit & impact",
    description:
      "Donations, campaigns, volunteer sign-ups, and impact storytelling.",
    background_image_url:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=80",
    sort_order: 130
  },
  {
    id: "sec_media",
    slug: "media",
    name: "Media & entertainment",
    description:
      "Streaming hubs, podcasts, event calendars, and fan communities.",
    background_image_url:
      "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1600&q=80",
    sort_order: 140
  },
  {
    id: "sec_manufacturing",
    slug: "manufacturing",
    name: "Manufacturing & logistics",
    description:
      "Inventory, supply-chain visibility, fleet dashboards, and warehouse ops.",
    background_image_url:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80",
    sort_order: 150
  }
];

export function listTemplateSectors(): TemplateSectorRow[] {
  return [...SECTOR_ROWS].sort((a, b) => a.sort_order - b.sort_order);
}

export function getTemplateSectorBySlug(
  slug: string
): TemplateSectorRow | undefined {
  return SECTOR_ROWS.find((s) => s.slug === slug);
}

export function listSectorSlugs(): string[] {
  return SECTOR_ROWS.map((s) => s.slug);
}
