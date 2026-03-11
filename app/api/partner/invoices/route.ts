import { NextRequest, NextResponse } from 'next/server';
import { requirePartner } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { eftPartnerInvoices } from '@/lib/db/schema';
import { eq, and, count, desc } from 'drizzle-orm';

/**
 * GET /api/partner/invoices
 * List partner's commission invoices with optional status filter
 */
export async function GET(request: NextRequest) {
  const auth = await requirePartner();
  if (!auth.authorized) return auth.response;
  const partnerId = auth.session.user.id;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build conditions
    const conditions = [eq(eftPartnerInvoices.partnerId, partnerId)];

    if (status) {
      conditions.push(eq(eftPartnerInvoices.status, status as any));
    }

    const whereClause = and(...conditions);

    // Count total
    const [totalResult] = await db
      .select({ total: count() })
      .from(eftPartnerInvoices)
      .where(whereClause);

    // Fetch invoices
    const invoices = await db
      .select()
      .from(eftPartnerInvoices)
      .where(whereClause)
      .orderBy(desc(eftPartnerInvoices.createdAt));

    return NextResponse.json({
      success: true,
      data: invoices,
      count: totalResult?.total || 0,
    });
  } catch (error: any) {
    console.error('Error fetching partner invoices:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
