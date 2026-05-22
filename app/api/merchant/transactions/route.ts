import { NextRequest, NextResponse } from 'next/server';
import { authenticateMerchant } from '@/lib/auth/merchant-auth';
import { db } from '@/lib/db';
import { eftTransactions } from '@/lib/db/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { z } from 'zod';

const querySchema = z.object({
  status: z.enum(['not_started', 'initiated', 'completed', 'failed', 'cancelled', 'aborted', 'expired']).optional(),
  paymentMethod: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  from: z.string().optional(), // ISO date string
  to: z.string().optional(),   // ISO date string
});

/**
 * GET /api/merchant/transactions
 * List merchant's own transactions.
 * Supports both session and API key authentication.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateMerchant(request, 'transactions.read');
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = request.nextUrl;
    const query = querySchema.parse({
      status: searchParams.get('status'),
      paymentMethod: searchParams.get('paymentMethod'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      from: searchParams.get('from'),
      to: searchParams.get('to'),
    });

    // Build where conditions
    const conditions = [];

    // Scope to merchant's own transactions
    conditions.push(eq(eftTransactions.merchantId, auth.merchantId));

    // Filter by status
    if (query.status) {
      conditions.push(eq(eftTransactions.status, query.status));
    }

    // Filter by payment method
    if (query.paymentMethod) {
      conditions.push(eq(eftTransactions.paymentMethod, query.paymentMethod));
    }

    // Filter by date range
    if (query.from) {
      conditions.push(gte(eftTransactions.createdAt, new Date(query.from)));
    }
    if (query.to) {
      conditions.push(lte(eftTransactions.createdAt, new Date(query.to)));
    }

    // Fetch transactions
    const transactions = await db
      .select()
      .from(eftTransactions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(eftTransactions.createdAt))
      .limit(query.limit)
      .offset(query.offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: db.$count(eftTransactions) })
      .from(eftTransactions)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        total: Number(count),
        limit: query.limit,
        offset: query.offset,
        hasMore: Number(count) > query.offset + query.limit,
      },
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
