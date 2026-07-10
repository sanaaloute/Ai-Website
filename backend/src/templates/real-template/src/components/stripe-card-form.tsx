"use client";

import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";

interface StripeCardFormProps {
  orderId: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function StripeCardForm({ orderId, onSuccess, onError }: StripeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      onError("Stripe has not loaded yet. Please wait a moment.");
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?orderId=${orderId}`,
      },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "Payment failed. Please try again.");
      setIsLoading(false);
    } else {
      // Payment succeeded without a redirect (e.g. no 3D Secure required)
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
        <PaymentElement
          options={{
            layout: "tabs",
            defaultValues: {
              billingDetails: {
                name: "",
              },
            },
          }}
        />
      </div>
      <Button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4 mr-2" />
            Pay with card
          </>
        )}
      </Button>
    </form>
  );
}
