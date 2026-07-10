import { NextRequest, NextResponse } from "next/server";
import { dataSource } from "@/lib/data-source";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const product = await dataSource.updateProduct(id, {
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
    console.error("Admin product update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dataSource.deleteProduct(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin product delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
