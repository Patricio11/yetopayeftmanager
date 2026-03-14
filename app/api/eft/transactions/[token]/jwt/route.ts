import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eftTransactions, eftBankAccounts, users } from "@/lib/db/schema";
import { verifyPaymentToken } from "@/lib/security/payment-token";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";

/**
 * POST /api/eft/transactions/[token]/jwt
 * Generate JWT token for public payment page (no auth required)
 * This endpoint is specifically for payment links accessed by customers
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: paymentToken } = await params;

    if (!paymentToken) {
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

    // Verify payment token
    const { transactionId, merchantId } = await verifyPaymentToken(
      paymentToken,
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

    // Fetch merchant's primary bank account (not required for demo mode)
    const isDemo = !!transaction.isDemo;
    const primaryBankAccount = await db.query.eftBankAccounts.findFirst({
      where: and(
        eq(eftBankAccounts.merchantId, merchantId),
        eq(eftBankAccounts.isPrimary, true)
      ),
    });

    if (!primaryBankAccount && !isDemo) {
      return NextResponse.json(
        {
          success: false,
          message: "Merchant bank account not configured"
        },
        { status: 400 }
      );
    }

    // Demo mode: skip JWT generation — no real EFT service call needed
    if (isDemo) {
      return NextResponse.json({
        success: true,
        jwt_token: 'demo_token',
        expires_in: 3600,
        eft_service_url: 'demo',
        isDemo: true,
      });
    }

    // Load private key from environment variable or file path
    const privateKeyContent = process.env.EFT_JWT_PRIVATE_KEY;
    const privateKeyPath = process.env.EFT_JWT_PRIVATE_KEY_PATH;

    if (!privateKeyContent && !privateKeyPath) {
      console.error("❌ EFT_JWT_PRIVATE_KEY or EFT_JWT_PRIVATE_KEY_PATH environment variable is not configured");
      return NextResponse.json(
        { 
          success: false,
          message: "EFT Service authentication not configured" 
        },
        { status: 500 }
      );
    }

    let privateKey: string;
    if (privateKeyContent) {
      privateKey = privateKeyContent.replace(/\\n/g, '\n');
    } else {
      const fs = await import('fs');
      privateKey = fs.readFileSync(privateKeyPath!, 'utf8');
    }

    // Prepare JWT payload with merchant bank account details
    const payload = {
      merchant_id: merchantId,
      transaction_id: transactionId,
      amount: transaction.amount,
      reference: transaction.reference,
      merchant_account_number: primaryBankAccount!.accountNumber,
      merchant_account_name: primaryBankAccount!.accountHolderName,
      merchant_account_type: primaryBankAccount!.accountType,
      merchant_reference: transaction.reference,
      merchant_name: merchant.companyName || merchant.name,
      merchant_bank: primaryBankAccount!.bankCode?.toLowerCase(),
      notify_url: transaction.notifyUrl || '',
    };

    // Generate JWT token
    const jwtToken = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      audience: 'eft-service',
      issuer: process.env.NEXT_PUBLIC_APP_URL || 'https://manager.onegate.co.za',
      expiresIn: '1h', // Token valid for 1 hour
    });

    console.log(`✅ JWT generated for public payment: ${transactionId}`);

    return NextResponse.json({
      success: true,
      jwt_token: jwtToken,
      expires_in: 3600, // 1 hour in seconds
      eft_service_url: process.env.NEXT_PUBLIC_EFT_SERVICE_URL || 'http://localhost:8080/v1/eft',
    });

  } catch (error: any) {
    console.error("❌ Error generating JWT for payment:", error);

    // Handle specific token errors
    if (error.message?.includes("expired")) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Payment link has expired",
        },
        { status: 410 }
      );
    }

    if (error.message?.includes("revoked")) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Payment link has been cancelled",
        },
        { status: 403 }
      );
    }

    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { 
          success: false, 
          message: "Failed to generate authentication token" 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        message: "An internal server error occurred" 
      },
      { status: 500 }
    );
  }
}
