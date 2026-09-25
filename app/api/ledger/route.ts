import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isFullAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { PaymentMethod, PaymentType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Payment ledger is strictly Management-only
    if (!isFullAccess(user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Management only" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId") || undefined;
    const customerId = searchParams.get("customerId") || undefined;

    const entries = await db.getPaymentLedger({ orderId, customerId });
    return NextResponse.json({ entries });
  } catch (err: any) {
    console.error("GET /api/ledger error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isFullAccess(user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Management only" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      orderId,
      customerId,
      amount,
      paymentMethod,
      transactionRef,
      referenceNumber,
      paymentType,
      notes,
    } = body;

    if (!orderId || amount === undefined || !paymentMethod || !paymentType) {
      return NextResponse.json(
        { error: "Missing required fields: orderId, amount, paymentMethod, paymentType" },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    const order = await db.getOrderById(orderId);
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const refNo = referenceNumber || transactionRef || "";

    const result = await db.recordPayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: customerId || order.customerId,
      customerName: order.customerName,
      amount: numAmount,
      paymentDate: new Date().toISOString(),
      paymentMethod: paymentMethod as PaymentMethod,
      referenceNumber: refNo,
      paymentType: paymentType as PaymentType,
      notes: notes || "",
      recordedById: user.id,
      recordedByName: user.name,
    });

    return NextResponse.json({ entry: result }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/ledger error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
