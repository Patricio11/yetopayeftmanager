import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { users, companyDocuments, onboardingRequirements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db
    .select({
      kycStatus: users.kycStatus,
      kycData: users.kycData,
      kycSubmittedAt: users.kycSubmittedAt,
      companyName: users.companyName,
      companyReg: users.companyReg,
      vatNumber: users.vatNumber,
      companyAddress: users.companyAddress,
      role: users.role,
      email: users.email,
      name: users.name,
      phone: users.phone,
      bankAccount: users.bankAccount,
      vettingAdminNote: users.vettingAdminNote,
      vettingRejectionReason: users.vettingRejectionReason,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const role = user.role as string;
  const requirements = await db
    .select()
    .from(onboardingRequirements)
    .where(eq(onboardingRequirements.active, true))
    .orderBy(onboardingRequirements.sortOrder);

  const filtered = requirements.filter(
    (r) => r.appliesTo === "both" || r.appliesTo === role
  );

  const docs = await db
    .select()
    .from(companyDocuments)
    .where(eq(companyDocuments.userId, session.user.id));

  return NextResponse.json({
    success: true,
    data: {
      kycStatus: user.kycStatus,
      kycData: user.kycData || {},
      kycSubmittedAt: user.kycSubmittedAt,
      companyName: user.companyName,
      companyReg: user.companyReg,
      vatNumber: user.vatNumber,
      companyAddress: user.companyAddress,
      email: user.email,
      name: user.name,
      phone: user.phone,
      bankAccount: user.bankAccount,
      vettingAdminNote: user.vettingAdminNote,
      vettingRejectionReason: user.vettingRejectionReason,
    },
    requirements: filtered.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      required: r.required,
      templateUrl: r.templateUrl,
      templateOriginalName: r.templateOriginalName,
    })),
    documents: docs.map((d) => ({
      requirementId: d.requirementId,
      originalName: d.originalName,
      url: d.url,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db
    .select({ id: users.id, kycStatus: users.kycStatus, role: users.role, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.kycStatus === "approved") {
    return NextResponse.json({ error: "KYC already approved" }, { status: 400 });
  }

  const body = await request.json();
  const { kycData, documents } = body;

  const errors: string[] = [];
  if (!kycData?.businessName?.trim()) errors.push("Business name is required");
  if (!kycData?.tradingName?.trim()) errors.push("Trading name is required");
  if (!kycData?.registrationNumber?.trim()) errors.push("Registration number is required");
  if (!kycData?.industry) errors.push("Industry is required");
  if (!kycData?.monthlyVolume) errors.push("Monthly volume is required");
  if (!kycData?.companyAddress?.trim()) errors.push("Company address is required");
  if (!kycData?.city?.trim()) errors.push("City is required");
  if (!kycData?.country) errors.push("Country is required");
  if (!kycData?.directorName?.trim()) errors.push("Director name is required");
  if (!kycData?.directorEmail?.trim()) errors.push("Director email is required");
  if (!kycData?.directorIdNumber?.trim()) errors.push("Director ID number is required");
  if (!kycData?.directorCapacity?.trim()) errors.push("Director capacity is required");
  if (!kycData?.directorHomeAddress?.trim()) errors.push("Director home address is required");
  if (!kycData?.primaryContactName?.trim()) errors.push("Primary contact name is required");
  if (!kycData?.primaryEmail?.trim()) errors.push("Primary email is required");
  if (!kycData?.primaryPhone?.trim()) errors.push("Primary phone number is required");
  if (!kycData?.bankName) errors.push("Bank name is required");
  if (!kycData?.accountHolder?.trim()) errors.push("Account holder is required");
  if (!kycData?.accountNumber?.trim()) errors.push("Account number is required");
  if (!kycData?.branchCode?.trim()) errors.push("Branch code is required");

  const role = user.role as string;
  const activeRequirements = await db
    .select()
    .from(onboardingRequirements)
    .where(eq(onboardingRequirements.active, true));

  const applicable = activeRequirements.filter(
    (r) => r.appliesTo === "both" || r.appliesTo === role
  );

  const submittedReqIds = new Set((documents || []).map((d: any) => d.requirementId));
  for (const r of applicable) {
    if (r.required && !submittedReqIds.has(r.id)) {
      errors.push(`${r.name} is required`);
    }
  }

  if (errors.length) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
  }

  await db
    .update(users)
    .set({
      kycData,
      kycStatus: "pending_review",
      kycSubmittedAt: new Date(),
      companyName: kycData.businessName?.trim() || undefined,
      companyReg: kycData.registrationNumber?.trim() || undefined,
      vatNumber: kycData.vatNumber?.trim() || null,
      companyAddress: kycData.companyAddress?.trim() || undefined,
      companyCountry: kycData.country || undefined,
      bankAccount: {
        bank_name: kycData.bankName,
        account_holder: kycData.accountHolder?.trim(),
        account_number: kycData.accountNumber?.trim(),
        branch_code: kycData.branchCode?.trim(),
      },
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  await db.delete(companyDocuments).where(eq(companyDocuments.userId, user.id));

  if (documents && documents.length > 0) {
    await db.insert(companyDocuments).values(
      documents.map((doc: any) => ({
        id: crypto.randomUUID(),
        userId: user.id,
        requirementId: doc.requirementId || null,
        originalName: doc.originalName,
        storedName: doc.storedName || null,
        url: doc.url,
        mimeType: doc.mimeType || null,
        sizeBytes: doc.sizeBytes || null,
        uploadedAt: new Date(),
      }))
    );
  }

  try {
    const { sendKycSubmissionEmail, sendAdminKycActionEmail } = await import("@/lib/email");
    await sendKycSubmissionEmail(user.email, kycData.businessName?.trim() || user.name || "");
    await sendAdminKycActionEmail("KYC Submitted", {
      name: user.name || "",
      email: user.email,
      companyName: kycData.businessName?.trim() || "",
    });
  } catch (e) {
    console.error("Failed to send KYC emails:", e);
  }

  return NextResponse.json({ success: true, status: "pending_review" });
}
