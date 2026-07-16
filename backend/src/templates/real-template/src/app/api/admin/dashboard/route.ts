import { NextRequest, NextResponse } from "next/server";
import { dataSource } from "@/lib/data-source";

export async function GET(_request: NextRequest) {
  try {
    const stats = await dataSource.getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
