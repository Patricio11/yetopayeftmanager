import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { users, onboardingRequirements, companyDocuments } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { OnboardingClient } from "./OnboardingClient";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.user.role === "admin") redirect("/dashboard/admin");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) redirect("/auth/login");

  let status = user.vettingStatus || "APPROVED";

  if (status === "EMAIL_PENDING" && user.emailVerified) {
    await db.update(users).set({ vettingStatus: "ONBOARDING_PENDING" }).where(eq(users.id, user.id));
    status = "ONBOARDING_PENDING";
  }

  if (status === "APPROVED") redirect("/dashboard");

  const role = user.role as string;
  const requirements =
    status === "ONBOARDING_PENDING"
      ? (
          await db
            .select()
            .from(onboardingRequirements)
            .where(eq(onboardingRequirements.active, true))
            .orderBy(asc(onboardingRequirements.sortOrder))
        ).filter((r) => r.appliesTo === "both" || r.appliesTo === role)
      : [];

  const docs = await db
    .select()
    .from(companyDocuments)
    .where(eq(companyDocuments.userId, user.id));

  return (
    <OnboardingClient
      status={status}
      user={{
        email: user.email,
        name: user.name,
        companyName: user.companyName || "",
        companyReg: user.companyReg || "",
        companyAddress: user.companyAddress || "",
        vatNumber: user.vatNumber || "",
        role: user.role || "merchant",
      }}
      adminNote={user.vettingAdminNote || null}
      rejectionReason={user.vettingRejectionReason || null}
      requirements={requirements.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        required: r.required,
        templateUrl: r.templateUrl,
        templateOriginalName: r.templateOriginalName,
      }))}
      existingDocs={docs.map((d) => ({
        requirementId: d.requirementId,
        originalName: d.originalName,
        url: d.url,
      }))}
    />
  );
}
