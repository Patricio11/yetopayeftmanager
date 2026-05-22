import { db } from "@/lib/db";
import { paymentServices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { CallPayConfig } from "./callpay";

export async function getProviderConfig(serviceCode: string): Promise<{
  provider: string;
  config: Record<string, any>;
} | null> {
  const [service] = await db
    .select()
    .from(paymentServices)
    .where(eq(paymentServices.code, serviceCode));

  if (!service || !service.isActive) return null;

  return {
    provider: service.provider,
    config: (service.providerConfig as Record<string, any>) || {},
  };
}

export function asCallPayConfig(config: Record<string, any>): CallPayConfig {
  if (!config.orgId || !config.salt) {
    throw new Error("CallPay not configured: missing orgId or salt");
  }
  return {
    apiUrl: config.apiUrl || "https://services.callpay.com/api/v2",
    orgId: config.orgId,
    salt: config.salt,
    webhookIps: config.webhookIps || ["54.72.191.28", "54.194.139.201"],
  };
}
