import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const createMerchantSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  companyName: z.string().min(1),
  companyLogoUrl: z.string().url().optional(),
});

/**
 * GET /api/admin/merchants
 * List all merchants (admin only)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const merchants = await db
      .select()
      .from(users)
      .where(eq(users.role, 'merchant'));

    return NextResponse.json({
      success: true,
      data: merchants,
      count: merchants.length,
    });
  } catch (error: any) {
    console.error('Error fetching merchants:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch merchants' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/merchants
 * Create a new merchant (admin only)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const validatedData = createMerchantSchema.parse(body);

    const [merchant] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email: validatedData.email,
        name: validatedData.name,
        role: 'merchant',
        companyName: validatedData.companyName,
        companyLogoUrl: validatedData.companyLogoUrl,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Merchant created successfully',
      data: merchant,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating merchant:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create merchant' },
      { status: 500 }
    );
  }
}
