import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      // In production, send a real email using a service like Resend, SendGrid, etc.
      // For now, log the reset URL to the console for development.
      console.log(`🔑 Password reset link for ${user.email}: ${url}`);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // In production, send a real email using a service like Resend, SendGrid, etc.
      // For now, log the verification URL to the console for development.
      console.log(`📧 Email verification link for ${user.email}: ${url}`);
    },
  },
  session: {
    expiresIn: 60 * 15, // 15 minutes
    updateAge: 60 * 5, // Update every 5 minutes
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "merchant",
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
