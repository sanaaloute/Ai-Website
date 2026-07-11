import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { dataSource } from "@/lib/data-source";
import Stripe from "stripe";

async function markPaymentSuccess(
  orderId: string,
  transactionId: string,
  amount: number
) {
  const payment = await dataSource.getPaymentByOrderId(orderId);
  if (payment) {
    await dataSource.updatePayment(payment.id, {
      status: "success",
      transactionId,
    });
  } else {
    // Safety net: create a payment record if one is missing
    const order = await dataSource.getOrderById(orderId);
    if (order) {
      await dataSource.createPayment({
        orderId,
        amount,
        method: order.paymentMethod,
        status: "success",
        transactionId,
      });
    }
  }
}

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const sig = request.headers.get("stripe-signature") || "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;

    if (orderId) {
      await dataSource.updateOrder(orderId, { status: "Paid" });
      await markPaymentSuccess(
        orderId,
        (session.payment_intent as string) ?? session.id,
        session.amount_total ? session.amount_total / 100 : 0
      );
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata?.orderId;

    if (orderId) {
      await dataSource.updateOrder(orderId, { status: "Paid" });
      await markPaymentSuccess(
        orderId,
        paymentIntent.id,
        paymentIntent.amount / 100
      );
    }
  }

  return NextResponse.json({ received: true });
}
