import { TemplatePresetRow } from "./types";

export const PRESET_ROWS: TemplatePresetRow[] = [
  {
    id: "tpl_shop_now",
    sector_id: "sec_ecommerce",
    slug: "shop-now",
    title: "Shop Now",
    short_description:
      "A modern shoe shopping website with product catalog, cart, and checkout experience.",
    website_url: "https://shop-now.dpqq.com/#why-us",
    git_repo_url: "https://www.gitcc.com/elsone/shop-now.git",
    suggested_prompt:
      "Build a shoe shopping website with product listings, size selector, add-to-cart, checkout flow, and responsive product gallery.",
    featured: true,
  },
  {
    id: "tpl_home_control",
    sector_id: "sec_saas",
    slug: "home-control",
    title: "Home Control",
    short_description:
      "A smart home dashboard to monitor and control devices, energy usage, and room status.",
    website_url: "https://home-control.dpqq.com/",
    git_repo_url: "https://www.gitcc.com/elsone/home-control.git",
    suggested_prompt:
      "Build a smart home device monitoring dashboard with room tabs, device toggle cards, temperature displays, energy usage charts, and alert notifications.",
    featured: true,
  },
];

export function listTemplatePresetsBySectorId(
  sectorId: string
): TemplatePresetRow[] {
  return PRESET_ROWS.filter((p) => p.sector_id === sectorId);
}

export function listFeaturedTemplates(): TemplatePresetRow[] {
  return PRESET_ROWS.filter((p) => p.featured);
}
