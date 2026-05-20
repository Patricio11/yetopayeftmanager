import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { writeAuditLog } from '@/lib/audit';

const IMPERSONATE_COOKIE = 'yp_impersonate';
const MAX_AGE = 60 * 60; // 1 hour

/**
 * GET /api/admin/impersonate
 * Check current impersonation status
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const cookieStore = await cookies();
  const targetId = cookieStore.get(IMPERSONATE_COOKIE)?.value;

  if (!targetId) {
    return NextResponse.json({ success: true, impersonating: false });
  }

  const [target] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, companyName: users.companyName })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);

  if (!target) {
    const res = NextResponse.json({ success: true, impersonating: false });
    res.cookies.delete(IMPERSONATE_COOKIE);
    return res;
  }

  return NextResponse.json({
    success: true,
    impersonating: true,
    target: {
      id: target.id,
      name: target.name,
      email: target.email,
      role: target.role,
      companyName: target.companyName,
    },
  });
}

/**
 * POST /api/admin/impersonate
 * Start impersonating a user
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;
  const adminId = auth.session.user.id;

  const { userId } = await request.json();
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const [target] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, companyName: users.companyName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (target.role === 'admin') {
    return NextResponse.json({ error: 'Cannot impersonate another admin' }, { status: 403 });
  }

  writeAuditLog({
    userId: adminId,
    action: 'impersonate_start',
    resource: 'user',
    resourceId: target.id,
    changes: { after: { targetEmail: target.email, targetRole: target.role } },
    request,
  });

  const res = NextResponse.json({
    success: true,
    message: `Now impersonating ${target.name || target.email}`,
    target: {
      id: target.id,
      name: target.name,
      email: target.email,
      role: target.role,
      companyName: target.companyName,
    },
  });

  res.cookies.set(IMPERSONATE_COOKIE, target.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });

  return res;
}

/**
 * DELETE /api/admin/impersonate
 * Stop impersonating
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;
  const adminId = auth.session.user.id;

  const cookieStore = await cookies();
  const targetId = cookieStore.get(IMPERSONATE_COOKIE)?.value;

  if (targetId) {
    writeAuditLog({
      userId: adminId,
      action: 'impersonate_stop',
      resource: 'user',
      resourceId: targetId,
      changes: {},
      request,
    });
  }

  const res = NextResponse.json({ success: true, message: 'Impersonation ended' });
  res.cookies.delete(IMPERSONATE_COOKIE);
  return res;
}
