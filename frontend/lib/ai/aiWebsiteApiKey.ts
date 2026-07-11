/**
 * Public URL shown to users for acquiring a AI-Website API key.
 *
 * The actual API key validation is performed by the backend; the frontend
 * no longer communicates directly with the AI gateway.
 */
export const AI_WEBSITE_API_KEY_SITE_URL =
  process.env.NEXT_PUBLIC_AI_WEBSITE_API_KEY_SITE_URL ||
  process.env.AI_WEBSITE_API_KEY_SITE_URL ||
  "https://www.tokenfree.com";
