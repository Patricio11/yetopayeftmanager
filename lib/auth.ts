import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "./db";
import * as schema from "./db/schema";
import { sendVerificationEmail, sendPasswordResetEmail, sendAdminNewRegistrationEmail, sendAdminEmailVerifiedEmail } from "./email";

const verifiedNotifications = new Set<string>();

async function getRegistrationNotificationEmails(): Promise<string[]> {
  const rows = await db
    .select({ settingValue: schema.platformSettings.settingValue })
    .from(schema.platformSettings)
    .where(eq(schema.platformSettings.settingKey, "registration_notification_emails"));
  const raw = rows[0]?.settingValue || "";
  return raw.split(",").map((e) => e.trim()).filter(Boolean);
}

export const auth = betterAuth({
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "https://www.onegate.co.za",
    "https://onegate.co.za",
    "https://oneeftmanager.vercel.app",
    "https://www.yetopay.co.za",
    "https://yetopay.co.za",
  ],
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
      await sendPasswordResetEmail(user.email, url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
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
      accountMode: {
        type: "string",
        required: false,
        defaultValue: "demo",
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            const recipients = await getRegistrationNotificationEmails();
            if (recipients.length > 0) {
              await sendAdminNewRegistrationEmail(recipients, {
                name: user.name,
                email: user.email,
              });
            }
          } catch (e) {
            console.error("Failed to send admin registration notification:", e);
          }
        },
      },
      update: {
        after: async (user) => {
          if (user.emailVerified === true && user.id && !verifiedNotifications.has(user.id)) {
            verifiedNotifications.add(user.id);
            if (verifiedNotifications.size > 1000) verifiedNotifications.clear();
            try {
              const recipients = await getRegistrationNotificationEmails();
              if (recipients.length > 0) {
                await sendAdminEmailVerifiedEmail(recipients, {
                  name: user.name,
                  email: user.email,
                });
              }
            } catch (e) {
              console.error("Failed to send admin verification notification:", e);
            }
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
