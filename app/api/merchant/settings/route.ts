import { NextRequest, NextResponse } from "next/server";
import { authenticateMerchant } from "@/lib/auth/merchant-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSettingsSchema = z.object({
  // Profile fields
  name: z.string().min(1).max(255).optional(),
  fullName: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),

  // Company fields
  companyName: z.string().max(255).optional(),
  address: z.object({
    street: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postal_code: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
  }).optional(),

  // Company metadata
  registrationNumber: z.string().max(50).optional(),
  vatNumber: z.string().max(50).optional(),
  website: z.string().url().max(255).optional().or(z.literal("")),

  // Banking fields
  bankAccount: z.object({
    account_holder: z.string().max(255).optional(),
    account_number: z.string().max(30).optional(),
    account_type: z.enum(["savings", "cheque", "transmission", "bond", "investment"]).optional(),
    bank_name: z.string().max(100).optional(),
    branch_code: z.string().max(20).optional(),
  }).optional(),

  // Notification preferences
  notificationPreferences: z.object({
    payment_completed: z.boolean().optional(),
    payment_failed: z.boolean().optional(),
    weekly_summary: z.boolean().optional(),
    security_alerts: z.boolean().optional(),
  }).optional(),

  // EFT Settings (default URLs)
  eftSettings: z.object({
    notifyUrl: z.string().url().max(500).optional().or(z.literal("")),
    successUrl: z.string().url().max(500).optional().or(z.literal("")),
    failureUrl: z.string().url().max(500).optional().or(z.literal("")),
    cancelledUrl: z.string().url().max(500).optional().or(z.literal("")),
  }).optional(),
}).strict();

/**
 * GET /api/merchant/settings
 * Fetch current merchant settings (profile, company, banking, notifications)
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateMerchant(request, 'settings.read');
  if (!auth.success) return auth.response;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, auth.merchantId),
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          name: user.name,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
        },
        company: {
          companyName: user.companyName,
          companyLogoUrl: user.companyLogoUrl || "",
          address: user.address || {},
          registrationNumber: (user.metadata as any)?.registrationNumber || "",
          vatNumber: (user.metadata as any)?.vatNumber || "",
          website: (user.metadata as any)?.website || "",
        },
        banking: {
          bankAccount: user.bankAccount || {},
        },
        notifications: {
          notificationPreferences: user.notificationPreferences || {
            payment_completed: true,
            payment_failed: true,
            weekly_summary: false,
            security_alerts: true,
          },
        },
        eftSettings: user.eftSettings || {
          notifyUrl: "",
          successUrl: "",
          failureUrl: "",
          cancelledUrl: "",
        },
      },
    });
  } catch (error) {
    console.error("Error fetching merchant settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/merchant/settings
 * Update merchant settings (profile, company, banking, notifications)
 */
export async function PATCH(request: NextRequest) {
  const auth = await authenticateMerchant(request, 'settings.write');
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const validated = updateSettingsSchema.parse(body);

    // Build the update object from only provided fields
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
      updatedBy: auth.merchantId,
    };

    // Profile fields
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.fullName !== undefined) updateData.fullName = validated.fullName;
    if (validated.phone !== undefined) updateData.phone = validated.phone;

    // Company fields
    if (validated.companyName !== undefined) updateData.companyName = validated.companyName;
    if (validated.address !== undefined) updateData.address = validated.address;

    // Banking fields
    if (validated.bankAccount !== undefined) updateData.bankAccount = validated.bankAccount;

    // Notification preferences
    if (validated.notificationPreferences !== undefined) {
      updateData.notificationPreferences = validated.notificationPreferences;
    }

    // EFT Settings
    if (validated.eftSettings !== undefined) {
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, auth.merchantId),
        columns: { eftSettings: true },
      });
      const currentEft = (currentUser?.eftSettings as any) || {};
      updateData.eftSettings = {
        ...currentEft,
        ...Object.fromEntries(
          Object.entries(validated.eftSettings).filter(([_, v]) => v !== undefined)
        ),
      };
    }

    // Company metadata (registrationNumber, vatNumber, website stored in metadata JSONB)
    if (validated.registrationNumber !== undefined || validated.vatNumber !== undefined || validated.website !== undefined) {
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, auth.merchantId),
      });
      const currentMetadata = (currentUser?.metadata as any) || {};
      updateData.metadata = {
        ...currentMetadata,
        ...(validated.registrationNumber !== undefined && { registrationNumber: validated.registrationNumber }),
        ...(validated.vatNumber !== undefined && { vatNumber: validated.vatNumber }),
        ...(validated.website !== undefined && { website: validated.website }),
      };
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, auth.merchantId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      data: {
        name: updated.name,
        fullName: updated.fullName,
        phone: updated.phone,
        companyName: updated.companyName,
        address: updated.address,
        bankAccount: updated.bankAccount,
        notificationPreferences: updated.notificationPreferences,
      },
    });
  } catch (error: any) {
    console.error("Error updating merchant settings:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
