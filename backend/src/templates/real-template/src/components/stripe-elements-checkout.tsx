"use client";

import { useEffect, useState } from "react";
import { loadStripe, type Stripe as StripeType } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { StripeCardForm } from "./stripe-card-form";
import { Loader2 } from "lucide-react";

let stripePromise: Promise<StripeType | null> | null = null;

async function getStripePromise() {
  if (!stripePromise) {
    const res = await fetch("/api/stripe/config");
    const data = await res.json();
    stripePromise = loadStripe(data.publishableKey || "");
  }
  return stripePromise;
}

interface StripeElementsCheckoutProps {
  orderId: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function StripeElementsCheckout({
  orderId,
  onSuccess,
  onError,
}: StripeElementsCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripe, setStripe] = useState<StripeType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const [paymentIntentRes, stripeInstance] = await Promise.all([
          fetch("/api/stripe/create-payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
          }),
          getStripePromise(),
        ]);

        const paymentIntentData = await paymentIntentRes.json();
        if (!paymentIntentRes.ok) {
          throw new Error(paymentIntentData.error || "Failed to initialize payment");
        }

        setClientSecret(paymentIntentData.clientSecret);
        setStripe(stripeInstance);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to initialize payment");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [orderId, onError, onSuccess]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-cyan-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Initializing secure checkout...
      </div>
    );
  }

  if (!clientSecret || !stripe) {
    return (
      <p className="text-sm text-red-400">
        Could not initialize payment. Please try again.
      </p>
    );
  }

  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#22d3ee",
            colorBackground: "#0f172a",
            colorText: "#e2e8f0",
            colorDanger: "#f87171",
            borderRadius: "0.5rem",
          },
        },
      }}
    >
      <StripeCardForm orderId={orderId} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}
