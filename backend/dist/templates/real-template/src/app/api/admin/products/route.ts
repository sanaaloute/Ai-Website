import { NextRequest, NextResponse } from "next/server";
import { dataSource } from "@/lib/data-source";

export async function GET(_request: NextRequest) {
  try {
    const products = await dataSource.getProducts();
    return NextResponse.json({ products });
  } catch (error) {
    console.error("Admin products GET error:", error);
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
      name,
      description,
      price,
      stock,
      imageUrl,
      specs,
      version,
      isAvailable,
    } = body;

    const product = await dataSource.createProduct({
      name,
      description,
      price,
      stock,
      imageUrl,
      specs,
      version,
      isAvailable,
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Admin product create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
