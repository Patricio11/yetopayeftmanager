import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { users, companyDocuments, onboardingRequirements } from "@/lib/db/schema";
import { eq, inArray, or, desc } from "drizzle-orm";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        role: users.role,
        companyName: users.companyName,
        companyReg: users.companyReg,
        companyAddress: users.companyAddress,
        companyCountry: users.companyCountry,
        vatNumber: users.vatNumber,
        emailVerified: users.emailVerified,
        isActive: users.isActive,
        kycStatus: users.kycStatus,
        kycData: users.kycData,
        kycSubmittedAt: users.kycSubmittedAt,
        accountMode: users.accountMode,
        vettingStatus: users.vettingStatus,
        vettingRejectionReason: users.vettingRejectionReason,
        vettingAdminNote: users.vettingAdminNote,
        vettingReviewedAt: users.vettingReviewedAt,
        vettingReviewedBy: users.vettingReviewedBy,
        mfaEnabled: users.mfaEnabled,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(or(eq(users.role, "merchant"), eq(users.role, "partner")))
      .orderBy(desc(users.updatedAt));

    const userIds = allUsers.map((u) => u.id);

    let docs: any[] = [];
    if (userIds.length > 0) {
      docs = await db
        .select()
        .from(companyDocuments)
        .where(inArray(companyDocuments.userId, userIds));
    }

    const reqIds = Array.from(
      new Set(docs.map((d) => d.requirementId).filter(Boolean))
    );
    let requirements: { id: string; name: string }[] = [];
    if (reqIds.length > 0) {
      requirements = await db
        .select({ id: onboardingRequirements.id, name: onboardingRequirements.name })
        .from(onboardingRequirements)
        .where(inArray(onboardingRequirements.id, reqIds));
    }

    const reqNameMap = new Map(requirements.map((r) => [r.id, r.name]));

    const data = allUsers.map((u) => ({
      ...u,
      documents: docs
        .filter((d) => d.userId === u.id)
        .map((d) => ({
          ...d,
          requirementName: d.requirementId ? reqNameMap.get(d.requirementId) || "Other" : "Other",
        })),
      documentCount: docs.filter((d) => d.userId === u.id).length,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching KYC users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
