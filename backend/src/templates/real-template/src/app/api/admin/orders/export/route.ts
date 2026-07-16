import { NextRequest, NextResponse } from "next/server";
import { dataSource } from "@/lib/data-source";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const fromDate = searchParams.get("from") || undefined;
    const toDate = searchParams.get("to") || undefined;

    const orders = await dataSource.getOrders({
      status: status !== "all" ? status : undefined,
      fromDate,
      toDate,
    });

    const headers = [
      "Order ID",
      "Customer",
      "Email",
      "Phone",
      "Shipping Address",
      "Total Amount",
      "Status",
      "Payment Method",
      "Payment Status",
      "Items",
      "Created At",
    ];

    const rows = orders.map((order) => [
      order.id,
      order.guestName || "N/A",
      order.guestEmail || "N/A",
      order.guestPhone || "N/A",
      `"${order.shippingAddress.replace(/"/g, '""')}"`,
      order.totalAmount.toFixed(2),
      order.status,
      order.paymentMethod,
      order.payment?.status || "N/A",
      `"${(order.items || []).map((i) => `${i.name} x${i.quantity}`).join("; ")}"`,
      new Date(order.createdAt).toISOString(),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=orders.csv",
      },
    });
  } catch (error) {
    console.error("Order export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
