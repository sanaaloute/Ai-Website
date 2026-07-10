import { NextRequest, NextResponse } from "next/server";
import { dataSource } from "@/lib/data-source";
import { verifyToken } from "@/lib/auth";

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId || null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const orders = await dataSource.getOrdersByUserId(userId);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items,
      shippingAddress,
      fullName,
      phone,
      email,
      paymentMethod,
    } = body;

    const userId = await getUserId(request);

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.price * item.quantity;
    }

    const tax = subtotal * 0.1; // 10% VAT
    const shipping = subtotal > 50 ? 0 : 10;
    const totalAmount = subtotal + tax + shipping;

    const order = await dataSource.createOrder({
      userId,
      guestEmail: email,
      guestName: fullName,
      guestPhone: phone,
      shippingAddress,
      totalAmount,
      status: "Pending",
      paymentMethod,
      items: items.map(
        (item: {
          productId: string;
          name: string;
          price: number;
          quantity: number;
          imageUrl: string;
        }) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
        })
      ),
    });

    // Create a pending payment record so the webhook can update it later
    await dataSource.createPayment({
      orderId: order.id,
      amount: totalAmount,
      method: paymentMethod,
      status: "pending",
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
