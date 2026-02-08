import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eftInvoices, eftInvoiceItems } from "@/lib/db/schema";
import { getSession } from "@/lib/auth-server";
import { eq, and, desc, count } from "drizzle-orm";

// GET /api/merchant/invoices — merchant views their own invoices
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const conditions = [eq(eftInvoices.merchantId, session.user.id)];
    if (status && status !== "all") {
      conditions.push(eq(eftInvoices.status, status as any));
    }

    const whereClause = and(...conditions);

    const invoices = await db
      .select()
      .from(eftInvoices)
      .where(whereClause)
      .orderBy(desc(eftInvoices.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count() })
      .from(eftInvoices)
      .where(whereClause);

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error("Error fetching merchant invoices:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
