import { NextRequest, NextResponse } from "next/server";
import { dataSource } from "@/lib/data-source";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "name";
    const version = searchParams.get("version") || "all";

    const where: Record<string, unknown> = { isAvailable: true };
    if (version !== "all") {
      where.version = version;
    }

    const orderBy: Record<string, string> =
      sort === "price-low"
        ? { price: "asc" }
        : sort === "price-high"
        ? { price: "desc" }
        : sort === "popularity"
        ? { orderCount: "desc" }
        : { name: "asc" };

    const products = await dataSource.getProducts({
      isAvailable: true,
      version: version !== "all" ? version : undefined,
      sort: sort as "name" | "price-low" | "price-high" | "popularity",
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Products error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
