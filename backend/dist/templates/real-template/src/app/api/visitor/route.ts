import { NextRequest, NextResponse } from "next/server";
import { dataSource } from "@/lib/data-source";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path } = body;

    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "";

    await dataSource.createVisitor({
      ip: ip.split(",")[0].trim(),
      userAgent,
      path: path || "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Visitor tracking error:", error);
    return NextResponse.json({ success: true });
  }
}
