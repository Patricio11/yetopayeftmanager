import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { users, companyDocuments, onboardingRequirements } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const role = user.role as string;
  const requirements = await db
    .select()
    .from(onboardingRequirements)
    .where(
      and(
        eq(onboardingRequirements.active, true),
      )
    )
    .orderBy(onboardingRequirements.sortOrder);

  const filteredRequirements = requirements.filter(
    (r) => r.appliesTo === "both" || r.appliesTo === role
  );

  const docs = await db
    .select()
    .from(companyDocuments)
    .where(eq(companyDocuments.userId, user.id));

  return NextResponse.json({
    success: true,
    data: {
      vettingStatus: user.vettingStatus,
      emailVerified: user.emailVerified,
      companyName: user.companyName,
      companyReg: user.companyReg,
      companyAddress: user.companyAddress,
      companyCountry: user.companyCountry,
      vatNumber: user.vatNumber,
      vettingRejectionReason: user.vettingRejectionReason,
      vettingAdminNote: user.vettingAdminNote,
      role: user.role,
    },
    requirements: filteredRequirements,
    documents: docs,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!user.emailVerified) {
    return NextResponse.json({ error: "Verify your email first" }, { status: 400 });
  }

  if (user.vettingStatus !== "ONBOARDING_PENDING") {
    return NextResponse.json(
      { error: `Cannot submit in ${user.vettingStatus} state` },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { companyName, companyReg, companyAddress, vatNumber, documents } = body;

  const errors: string[] = [];
  if (!companyName?.trim()) errors.push("Company name is required");
  if (!companyReg?.trim()) errors.push("Registration number is required");
  if (!companyAddress?.trim()) errors.push("Company address is required");

  const role = user.role as string;
  const activeRequirements = await db
    .select()
    .from(onboardingRequirements)
    .where(eq(onboardingRequirements.active, true));

  const applicableRequirements = activeRequirements.filter(
    (r) => r.appliesTo === "both" || r.appliesTo === role
  );

  const submittedReqIds = new Set(
    (documents || []).map((d: any) => d.requirementId)
  );

  for (const r of applicableRequirements) {
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
      companyName: companyName.trim(),
      companyReg: companyReg.trim(),
      companyAddress: companyAddress.trim(),
      vatNumber: vatNumber?.trim() || null,
      vettingStatus: "APPROVED",
      vettingAdminNote: null,
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
    await sendKycSubmissionEmail(user.email, companyName.trim());
    await sendAdminKycActionEmail("New Submission", {
      name: user.name || "",
      email: user.email,
      companyName: companyName.trim(),
    });
  } catch (e) {
    console.error("Failed to send onboarding emails:", e);
  }

  return NextResponse.json({ success: true, status: "APPROVED" });
}
