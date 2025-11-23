import { NextRequest, NextResponse } from 'next/server';
import { requireMerchant } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { eftTransactions } from '@/lib/db/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { z } from 'zod';

const querySchema = z.object({
  status: z.enum(['not_started', 'initiated', 'completed', 'failed', 'cancelled', 'aborted', 'expired']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  from: z.string().optional(), // ISO date string
  to: z.string().optional(),   // ISO date string
});

/**
 * GET /api/merchant/transactions
 * List merchant's own transactions
 * Admin can see all, merchant sees only own
 */
export async function GET(request: NextRequest) {
  const auth = await requireMerchant();
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = request.nextUrl;
    const query = querySchema.parse({
      status: searchParams.get('status'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      from: searchParams.get('from'),
      to: searchParams.get('to'),
    });

    // Build where conditions
    const conditions = [];

    // Merchant sees only own transactions, admin sees all
    if (auth.authorized && (auth.session.user.role || 'merchant') !== 'admin') {
      conditions.push(eq(eftTransactions.merchantId, auth.session.user.id));
    }

    // Filter by status
    if (query.status) {
      conditions.push(eq(eftTransactions.status, query.status));
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
