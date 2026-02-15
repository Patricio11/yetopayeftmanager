import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eftTransactions, eftBanks, eftBankAccounts, users } from "@/lib/db/schema";
import { verifyPaymentToken } from "@/lib/security/payment-token";
import { eq, and, asc } from "drizzle-orm";

/**
 * Mask a bank account number, showing only the last 4 digits.
 * e.g. "62123456789" → "•••••••6789"
 */
function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length <= 4) return accountNumber;
  const last4 = accountNumber.slice(-4);
  const masked = '•'.repeat(accountNumber.length - 4);
  return `${masked}${last4}`;
}

/**
 * GET /api/eft/transactions/[token]/init
 * Initialize EFT transaction - Returns all data needed for payment page
 * This endpoint verifies the token and returns merchant + bank details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token is required" },
        { status: 400 }
      );
    }

    // Get IP and User Agent for security tracking
    const ipAddress = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Verify payment token (checks expiration, revocation, rate limiting)
    const { transactionId, merchantId } = await verifyPaymentToken(
      token,
      ipAddress,
      userAgent
    );

    // Fetch transaction details
    const transaction = await db.query.eftTransactions.findFirst({
      where: eq(eftTransactions.id, transactionId),
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: "Transaction not found" },
        { status: 404 }
      );
    }

    // Check transaction status - block all terminal states
    const terminalStatuses: Record<string, { message: string; status: string }> = {
      completed: { message: "This payment has already been completed", status: "completed" },
      failed: { message: "This payment has failed. Please request a new payment link.", status: "failed" },
      aborted: { message: "This payment was aborted. Please request a new payment link.", status: "failed" },
      cancelled: { message: "This payment has been cancelled.", status: "failed" },
      expired: { message: "This payment link has expired. Please request a new one.", status: "failed" },
    };

    const terminalInfo = terminalStatuses[transaction.status || ""];
    if (terminalInfo) {
      return NextResponse.json(
        { 
          success: false, 
          message: terminalInfo.message,
          status: terminalInfo.status,
        },
        { status: 410 } // Gone
      );
    }

    // Fetch merchant details
    const merchant = await db.query.users.findFirst({
      where: eq(users.id, merchantId),
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: "Merchant not found" },
        { status: 404 }
      );
    }

    // Fetch merchant's primary bank account
    const primaryBankAccount = await db.query.eftBankAccounts.findFirst({
      where: and(
        eq(eftBankAccounts.merchantId, merchantId),
        eq(eftBankAccounts.isPrimary, true)
      ),
    });

    if (!primaryBankAccount) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Merchant has no primary bank account configured. Please contact the merchant." 
        },
        { status: 400 }
      );
    }

    // Fetch enabled EFT banks ordered by displayOrder
    const enabledBanks = await db.query.eftBanks.findMany({
      where: eq(eftBanks.enabled, true),
      orderBy: [asc(eftBanks.displayOrder)],
    });

    // Map banks to frontend format
    const mappedBanks = enabledBanks.map(bank => ({
      code: bank.code,
      name: bank.bankName,
      color: bank.color,
      enabled: bank.enabled,
    }));

    // Construct response payload
    const responsePayload = {
      success: true,
      message: "Transaction initialized successfully",
      data: {
        sessionId: transaction.id, // Session ID = Transaction ID
        paymentDetails: {
          amount: parseFloat(transaction.amount),
          reference: transaction.reference,
          description: transaction.description,
          notifyUrl: transaction.notifyUrl,
          successUrl: transaction.successUrl,
          failureUrl: transaction.failureUrl,
          cancelledUrl: transaction.cancelledUrl,
        },
        merchant: {
          id: merchant.id || merchantId, // Fallback to merchantId from token if merchant.id is undefined
          name: merchant.companyName || merchant.name,
          logo: merchant.companyLogoUrl,
          email: merchant.email,
          // Bank account details for payment
          bankAccount: {
            accountNumber: maskAccountNumber(primaryBankAccount.accountNumber),
            accountName: primaryBankAccount.accountHolderName,
            branchCode: primaryBankAccount.branchCode,
            bankCode: primaryBankAccount.bankCode,
            accountType: primaryBankAccount.accountType,
          },
        },
        banks: mappedBanks,
        isDemo: !!transaction.isDemo,
        step: "init", // Initial step for frontend
        token, // Include token for subsequent requests
      },
    };

    console.log(`✅ Transaction initialized: ${transaction.id} for merchant ${merchantId}`);

    return NextResponse.json(responsePayload);

  } catch (error: any) {
    console.error("❌ Error initializing transaction:", error);

    // Handle specific token errors
    if (error.message?.includes("expired")) {
      return NextResponse.json(
        { 
          success: false, 
          message: "This payment link has expired. Please request a new one from the merchant.",
          error: "token_expired"
        },
        { status: 410 }
      );
    }

    if (error.message?.includes("revoked")) {
      return NextResponse.json(
        { 
          success: false, 
          message: "This payment link has been cancelled by the merchant.",
          error: "token_revoked"
        },
        { status: 403 }
      );
    }

    if (error.message?.includes("used")) {
      return NextResponse.json(
        { 
          success: false, 
          message: "This payment link has already been used.",
          error: "token_used"
        },
        { status: 410 }
      );
    }

    if (error.message?.includes("rate limit")) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Too many attempts. Please try again later.",
          error: "rate_limit_exceeded"
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "An internal server error occurred. Please try again.",
        error: "internal_server_error"
      },
      { status: 500 }
    );
  }
}
