import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { eftTransactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { z } from "zod";

const jwtRequestSchema = z.object({
  transactionId: z.string().uuid("Invalid transaction ID"),
  sessionData: z.object({
    merchant_account_number: z.string(),
    merchant_account_name: z.string(),
    merchant_account_type: z.string(),
    merchant_reference: z.string(),
    merchant_name: z.string(),
    merchant_bank: z.string(),
    amount: z.string(),
    notify_url: z.string().url().or(z.literal('')).optional(),
  }).optional(),
});

/**
 * POST /api/eft/jwt
 * Generate JWT token for EFT Service authentication
 * This token is used to authenticate with the EFT Service (localhost:8080)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = jwtRequestSchema.parse(body);

    // Verify transaction belongs to merchant
    const transaction = await db.query.eftTransactions.findFirst({
      where: and(
        eq(eftTransactions.id, validatedData.transactionId),
        eq(eftTransactions.merchantId, session.user.id)
      ),
    });

    if (!transaction) {
      return NextResponse.json(
        { 
          error: "Not found", 
          message: "Transaction not found or you don't have permission to access it" 
        },
        { status: 404 }
      );
    }

    // Check if private key is configured
    const privateKeyPath = process.env.EFT_JWT_PRIVATE_KEY_PATH;
    const privateKeyContent = process.env.EFT_JWT_PRIVATE_KEY;

    if (!privateKeyPath && !privateKeyContent) {
      console.error("❌ EFT JWT private key not configured");
      return NextResponse.json(
        { 
          error: "Configuration error", 
          message: "EFT Service authentication not configured. Please contact support." 
        },
        { status: 500 }
      );
    }

    // Load private key
    let privateKey: string;
    
    if (privateKeyContent) {
      // Use key from environment variable (preferred for production)
      privateKey = privateKeyContent.replace(/\\n/g, '\n');
    } else {
      // Load from file (development)
      const fs = await import('fs');
      privateKey = fs.readFileSync(privateKeyPath!, 'utf8');
    }

    // Prepare JWT payload
    const payload = {
      merchant_id: session.user.id,
      transaction_id: validatedData.transactionId,
      amount: transaction.amount,
      reference: transaction.reference,
      // Include session data if provided
      ...(validatedData.sessionData || {}),
    };

    // Generate JWT token
    const token = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      audience: 'eft-service',
      issuer: process.env.NEXT_PUBLIC_APP_URL || 'https://manager.yetopay.co.za',
      expiresIn: '1h', // Token valid for 1 hour
    });

    console.log(`✅ JWT generated for transaction ${validatedData.transactionId}`);

    return NextResponse.json({
      success: true,
      jwt_token: token,
      expires_in: 3600, // 1 hour in seconds
      eft_service_url: process.env.EFT_SERVICE_URL || 'http://localhost:8080',
    });

  } catch (error: any) {
    console.error("❌ Error generating JWT:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Validation error", 
          message: "Invalid request data",
          details: error.issues 
        },
        { status: 400 }
      );
    }

    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { 
          error: "JWT error", 
          message: "Failed to generate authentication token" 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Failed to generate JWT token" 
      },
      { status: 500 }
    );
  }
}
