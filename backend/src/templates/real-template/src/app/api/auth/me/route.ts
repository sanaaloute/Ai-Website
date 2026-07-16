import { NextRequest, NextResponse } from "next/server";
import { dataSource } from "@/lib/data-source";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await dataSource.getUserById(payload.userId);

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
