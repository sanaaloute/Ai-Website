import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { dataSource } from "@/lib/data-source";
import Stripe from "stripe";

function getPaymentMethodTypes(
  paymentMethod: string
): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  switch (paymentMethod) {
    case "alipay":
      return ["alipay"];
    case "wechatpay":
      return ["wechat_pay"];
    case "unionpay":
      return ["card"]; // UnionPay cards are processed through card networks
    case "stripe":
    default:
      return ["card"];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, paymentMethod = "stripe" } = body;

    const order = await dataSource.getOrderById(orderId);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const lineItems = (order.items || []).map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          images: [
            item.imageUrl.startsWith("http")
              ? item.imageUrl
              : `${process.env.NEXT_PUBLIC_APP_URL}${item.imageUrl}`,
          ],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: getPaymentMethodTypes(paymentMethod),
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?orderId=${order.id}&canceled=true`,
      metadata: {
        orderId: order.id,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
