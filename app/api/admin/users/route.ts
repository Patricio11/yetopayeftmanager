import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { desc, sql, eq, and, or } from 'drizzle-orm';

/**
 * GET /api/admin/users
 * List all users with search, filter, pagination
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const role = searchParams.get('role');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const offset = (page - 1) * limit;

  try {
    const conditions = [];

    if (role && role !== 'all') {
      conditions.push(eq(users.role, role as any));
    }
    if (status === 'active') {
      conditions.push(eq(users.isActive, true));
    } else if (status === 'inactive') {
      conditions.push(eq(users.isActive, false));
    }
    if (search) {
      conditions.push(
        sql`(${users.name} ILIKE ${'%' + search + '%'} OR ${users.email} ILIKE ${'%' + search + '%'} OR ${users.companyName} ILIKE ${'%' + search + '%'})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        role: users.role,
        companyName: users.companyName,
        companyLogoUrl: users.companyLogoUrl,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        kycStatus: users.kycStatus,
        lastLogin: users.lastLogin,
        balance: users.balance,
        createdAt: users.createdAt,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause);

    return NextResponse.json({
      success: true,
      data: allUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
