/**
 * Partner Sub-Merchants (Connector Merchants)
 *
 * Partners integrated via API can pass a `merchant` object when creating a
 * payment link. The transaction is then attributed to that sub-merchant:
 * the payment page shows the sub-merchant's name/logo and the customer pays
 * into the sub-merchant's bank account — not the partner's.
 *
 * Sub-merchants are stored as real `users` rows (role "merchant") linked to
 * the partner via `partnerId`, with `metadata.managedByPartner = true` and
 * `isActive = false` (no credentials — cannot log in until invited).
 * Merchant name is unique per partner (case-insensitive on companyName), so
 * repeat calls can send just the name and reuse everything stored.
 */

import { db } from "@/lib/db";
import { users, eftBankAccounts } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";

export const subMerchantBankAccountSchema = z.object({
  accountHolderName: z.string().min(1, "Account holder name is required").max(255),
  accountNumber: z.string().min(4, "Account number is required").max(30),
  bankCode: z.string().min(1, "Bank code is required").max(50),
  branchCode: z.string().max(20).optional(),
  branchName: z.string().max(255).optional(),
  accountType: z
    .enum(["savings", "cheque", "transmission", "bond", "investment"])
    .default("cheque"),
});

export const subMerchantSchema = z.object({
  name: z.string().min(2, "Merchant name is required").max(255),
  email: z.string().email("Invalid merchant email").optional(),
  phone: z.string().max(50).optional(),
  logoUrl: z.string().url("Invalid logo URL").optional(),
  bankAccount: subMerchantBankAccountSchema.optional(),
});

export type SubMerchantInput = z.infer<typeof subMerchantSchema>;

export interface ResolvedSubMerchant {
  merchant: typeof users.$inferSelect;
  created: boolean;
  hasPrimaryBankAccount: boolean;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "merchant";
}

/** Synthetic unique email for sub-merchants created without one. */
function syntheticEmail(name: string): string {
  const shortId = crypto.randomBytes(4).toString("hex");
  return `sub-${slugify(name)}-${shortId}@sub.yetopay.internal`;
}

export function isSyntheticEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith("@sub.yetopay.internal");
}

/**
 * Find an existing sub-merchant by name under this partner (case-insensitive
 * companyName match), or create a shadow merchant record.
 * Updates stored details when new info is supplied on subsequent calls.
 */
export async function resolveSubMerchant(
  partnerId: string,
  input: SubMerchantInput,
  partnerAccountMode: "demo" | "live"
): Promise<ResolvedSubMerchant> {
  const name = input.name.trim();

  // Case-insensitive lookup scoped to this partner
  const existing = await db.query.users.findFirst({
    where: and(
      eq(users.partnerId, partnerId),
      eq(users.role, "merchant"),
      sql`lower(${users.companyName}) = ${name.toLowerCase()}`
    ),
  });

  let merchant: typeof users.$inferSelect;
  let created = false;

  if (existing) {
    merchant = existing;

    // The connector platform is the source of truth — refresh stored details
    // from whatever it sends. Email is the exception: a real email is login
    // identity and is never overwritten (only a synthetic placeholder is).
    const updates: Record<string, any> = {};
    if (input.email && isSyntheticEmail(existing.email)) {
      const emailTaken = await db.query.users.findFirst({
        where: eq(users.email, input.email.toLowerCase()),
        columns: { id: true },
      });
      if (!emailTaken) updates.email = input.email.toLowerCase();
    }
    if (input.phone && input.phone !== existing.phone) updates.phone = input.phone;
    if (input.logoUrl && input.logoUrl !== existing.companyLogoUrl) updates.companyLogoUrl = input.logoUrl;

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, existing.id))
        .returning();
      merchant = updated;
    }
  } else {
    const email = input.email?.toLowerCase() || syntheticEmail(name);

    // A provided email must not belong to another account
    if (input.email) {
      const emailTaken = await db.query.users.findFirst({
        where: eq(users.email, email),
        columns: { id: true },
      });
      if (emailTaken) {
        throw new SubMerchantError(
          `The email "${input.email}" already belongs to another YetoPay account. ` +
            `Omit the email or use a different one.`,
          409
        );
      }
    }

    const [inserted] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        name,
        email,
        emailVerified: false,
        role: "merchant",
        companyName: name,
        companyLogoUrl: input.logoUrl || null,
        phone: input.phone || null,
        partnerId,
        isActive: false, // shadow record — cannot log in until invited
        accountMode: partnerAccountMode,
        kycStatus: "pending",
        metadata: { managedByPartner: true, source: "payment-link-api" },
        createdBy: partnerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    merchant = inserted;
    created = true;
  }

  // Upsert primary bank account when provided
  if (input.bankAccount) {
    const primary = await db.query.eftBankAccounts.findFirst({
      where: and(
        eq(eftBankAccounts.merchantId, merchant.id),
        eq(eftBankAccounts.isPrimary, true)
      ),
    });

    if (primary) {
      await db
        .update(eftBankAccounts)
        .set({
          accountNumber: input.bankAccount.accountNumber,
          accountHolderName: input.bankAccount.accountHolderName,
          bankCode: input.bankAccount.bankCode,
          branchCode: input.bankAccount.branchCode || primary.branchCode,
          branchName: input.bankAccount.branchName || primary.branchName,
          accountType: input.bankAccount.accountType,
          updatedAt: new Date(),
        })
        .where(eq(eftBankAccounts.id, primary.id));
    } else {
      await db.insert(eftBankAccounts).values({
        merchantId: merchant.id,
        accountNumber: input.bankAccount.accountNumber,
        accountHolderName: input.bankAccount.accountHolderName,
        accountName: name,
        bankCode: input.bankAccount.bankCode,
        branchCode: input.bankAccount.branchCode || null,
        branchName: input.bankAccount.branchName || null,
        accountType: input.bankAccount.accountType,
        isPrimary: true,
        isVerified: false,
      });
    }
  }

  const hasPrimaryBankAccount = input.bankAccount
    ? true
    : !!(await db.query.eftBankAccounts.findFirst({
        where: and(
          eq(eftBankAccounts.merchantId, merchant.id),
          eq(eftBankAccounts.isPrimary, true)
        ),
        columns: { id: true },
      }));

  return { merchant, created, hasPrimaryBankAccount };
}

export class SubMerchantError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "SubMerchantError";
    this.status = status;
  }
}

/** Check whether a user record is a partner-managed shadow merchant. */
export function isPartnerManaged(user: { metadata?: any }): boolean {
  return !!(user.metadata as any)?.managedByPartner;
}
