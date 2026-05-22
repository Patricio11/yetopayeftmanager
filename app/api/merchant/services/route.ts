import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { paymentServices, userServices, eftSystemFees, eftMerchantFees } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const userId = auth.session.user.id;

  try {
    const allServices = await db
      .select()
      .from(paymentServices)
      .where(eq(paymentServices.isActive, true))
      .orderBy(asc(paymentServices.displayOrder));

    const merchantServices = await db
      .select()
      .from(userServices)
      .where(eq(userServices.userId, userId));

    const merchantServiceMap = new Map(
      merchantServices.map((ms) => [ms.serviceName, ms])
    );

    const systemFees = await db.select().from(eftSystemFees);
    const systemFeeMap = new Map(systemFees.map((f) => [f.serviceName, f]));

    const merchantFees = await db
      .select()
      .from(eftMerchantFees)
      .where(eq(eftMerchantFees.merchantId, userId));
    const merchantFeeMap = new Map(merchantFees.map((f) => [f.serviceName, f]));

    const data = allServices.map((service) => {
      const ms = merchantServiceMap.get(service.code);
      const sysFee = systemFeeMap.get(service.code);
      const mFee = merchantFeeMap.get(service.code);

      const effectiveFee = mFee || sysFee;

      return {
        id: service.id,
        code: service.code,
        name: service.name,
        description: service.description,
        category: service.category,
        icon: service.icon,
        isEnabled: ms?.isEnabled ?? false,
        fee: effectiveFee
          ? {
              feeType: mFee?.feeType || "fixed",
              fixedFeeValue: effectiveFee.fixedFeeValue,
              percentageFeeValue: effectiveFee.percentageFeeValue,
              volumeFeeValue: effectiveFee.volumeFeeValue,
              vatEnabled: effectiveFee.vatEnabled,
              vatRate: effectiveFee.vatRate,
            }
          : null,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching merchant services:", error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}
