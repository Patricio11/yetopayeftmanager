import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/admin/partners/[id]/merchants
 * List all merchants belonging to a specific partner
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const merchants = await db
      .select()
      .from(users)
      .where(and(eq(users.partnerId, id), eq(users.role, 'merchant')));

    return NextResponse.json({
      success: true,
      data: merchants,
      count: merchants.length,
    });
  } catch (error: any) {
    console.error('Error fetching partner merchants:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch partner merchants' },
      { status: 500 }
    );
  }
}
