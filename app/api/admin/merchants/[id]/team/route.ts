import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { merchantTeamMembers, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/admin/merchants/[id]/team
 * Get all team members for a specific merchant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const members = await db
      .select({
        id: merchantTeamMembers.id,
        role: merchantTeamMembers.role,
        permissions: merchantTeamMembers.permissions,
        status: merchantTeamMembers.status,
        invitedAt: merchantTeamMembers.invitedAt,
        acceptedAt: merchantTeamMembers.acceptedAt,
        createdAt: merchantTeamMembers.createdAt,
        userName: users.name,
        userEmail: users.email,
        userPhone: users.phone,
        userImage: users.image,
        userIsActive: users.isActive,
        userLastLogin: users.lastLogin,
      })
      .from(merchantTeamMembers)
      .leftJoin(users, eq(merchantTeamMembers.userId, users.id))
      .where(eq(merchantTeamMembers.merchantId, id));

    return NextResponse.json({
      success: true,
      data: members,
      count: members.length,
    });
  } catch (error: any) {
    console.error('Error fetching merchant team:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
