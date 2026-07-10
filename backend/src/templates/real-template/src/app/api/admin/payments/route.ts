import { NextRequest, NextResponse } from "next/server";
import { dataSource } from "@/lib/data-source";

export async function GET(_request: NextRequest) {
  try {
    const payments = await dataSource.getPayments();
    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Admin payments GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
