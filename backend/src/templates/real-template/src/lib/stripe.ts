import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2026-05-27.dahlia",
      typescript: true,
    });
  }
  return stripeInstance;
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    const s = getStripe();
    const value = (s as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(s);
    }
    return value;
  },
});

export function getStripePublishableKey(): string {
  return process.env.STRIPE_PUBLISHABLE_KEY || "";
}
