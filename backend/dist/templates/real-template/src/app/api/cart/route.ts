import { NextRequest, NextResponse } from "next/server";
import { dataSource } from "@/lib/data-source";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

async function getSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("sessionId")?.value;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    cookieStore.set("sessionId", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return sessionId;
}

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId || null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const sessionId = !userId ? await getSessionId() : null;

    const cartItems = await dataSource.getCartItems(userId, sessionId);

    return NextResponse.json({ cart: cartItems });
  } catch (error) {
    console.error("Cart GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, quantity = 1 } = body;
    const userId = await getUserId(request);
    const sessionId = !userId ? await getSessionId() : null;

    const existing = await dataSource.getCartItem(userId, sessionId, productId);

    if (existing) {
      const updated = await dataSource.updateCartItem(existing.id, {
        quantity: existing.quantity + quantity,
      });
      return NextResponse.json({ item: updated });
    }

    const item = await dataSource.createCartItem({
      userId,
      sessionId,
      productId,
      quantity,
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Cart POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { cartItemId, quantity } = body;

    if (quantity < 1) {
      await dataSource.deleteCartItem(cartItemId);
      return NextResponse.json({ removed: true });
    }

    const updated = await dataSource.updateCartItem(cartItemId, { quantity });

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error("Cart PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cartItemId = searchParams.get("id");

    if (!cartItemId) {
      return NextResponse.json(
        { error: "Cart item ID required" },
        { status: 400 }
      );
    }

    await dataSource.deleteCartItem(cartItemId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cart DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
