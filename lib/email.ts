import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 2525,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const from = `${process.env.SMTP_FROM_NAME || "Yetopay"} <${process.env.SMTP_FROM || "noreply@yetopay.com"}>`;

export async function sendVerificationEmail(email: string, url: string) {
  await transporter.sendMail({
    from,
    to: email,
    subject: "Verify your email - Yetopay",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(to right, #16a34a, #059669); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0;">Yetopay</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <h2 style="color: #1f2937;">Verify your email address</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Thanks for signing up! Please verify your email address by clicking the button below.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${url}" style="background-color: #16a34a; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 14px;">
            If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
        <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
          &copy; ${new Date().getFullYear()} Yetopay. All rights reserved.
        </div>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, url: string) {
  await transporter.sendMail({
    from,
    to: email,
    subject: "Reset your password - Yetopay",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(to right, #16a34a, #059669); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0;">Yetopay</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <h2 style="color: #1f2937;">Reset your password</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            We received a request to reset your password. Click the button below to choose a new password.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${url}" style="background-color: #16a34a; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 14px;">
            If you didn't request a password reset, you can safely ignore this email. This link will expire in 1 hour.
          </p>
        </div>
        <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
          &copy; ${new Date().getFullYear()} Yetopay. All rights reserved.
        </div>
      </div>
    `,
  });
}
