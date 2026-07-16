import { NextResponse } from "next/server";
import { getStripePublishableKey } from "@/lib/stripe";

export async function GET() {
  return NextResponse.json({ publishableKey: getStripePublishableKey() });
}
