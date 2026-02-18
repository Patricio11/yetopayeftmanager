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

export async function sendBankAlertEmail(
  bankName: string,
  bankCode: string,
  failureCount: number,
  recipients: string[]
) {
  const subject = `🚨 Bank Auto-Disabled: ${bankName} — Yetopay Alert`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(to right, #dc2626, #b91c1c); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0;">Yetopay</h1>
        <p style="color: #fecaca; margin: 8px 0 0;">Bank Health Alert</p>
      </div>
      <div style="padding: 32px; background: #ffffff;">
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="color: #dc2626; margin: 0 0 8px;">⚠️ ${bankName} Has Been Automatically Disabled</h2>
          <p style="color: #7f1d1d; margin: 0;">Bank code: <strong>${bankCode}</strong></p>
        </div>
        <p style="color: #4b5563; line-height: 1.6;">
          The Yetopay monitoring system detected <strong>${failureCount} consecutive failed transactions</strong>
          for <strong>${bankName}</strong>. To protect customers, this bank has been automatically disabled
          and will no longer appear on payment pages.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <tr style="background: #f9fafb;">
            <td style="padding: 10px 16px; color: #6b7280; font-size: 14px;">Bank</td>
            <td style="padding: 10px 16px; color: #111827; font-weight: 600;">${bankName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 16px; color: #6b7280; font-size: 14px;">Code</td>
            <td style="padding: 10px 16px; color: #111827; font-weight: 600;">${bankCode}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 10px 16px; color: #6b7280; font-size: 14px;">Consecutive Failures</td>
            <td style="padding: 10px 16px; color: #dc2626; font-weight: 600;">${failureCount}</td>
          </tr>
          <tr>
            <td style="padding: 10px 16px; color: #6b7280; font-size: 14px;">Disabled At</td>
            <td style="padding: 10px 16px; color: #111827; font-weight: 600;">${new Date().toUTCString()}</td>
          </tr>
        </table>
        <p style="color: #4b5563; line-height: 1.6;">
          Please investigate the issue and re-enable the bank via the admin dashboard once resolved.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/banks"
            style="background-color: #dc2626; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Go to Banks Dashboard
          </a>
        </div>
      </div>
      <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
        &copy; ${new Date().getFullYear()} Yetopay. This is an automated alert from the bank health monitoring system.
      </div>
    </div>
  `;

  await transporter.sendMail({ from, to: recipients.join(", "), subject, html });
}

export async function sendBankRecoveryEmail(
  bankName: string,
  bankCode: string,
  recipients: string[]
) {
  const subject = `✅ Bank Recovered: ${bankName} — Yetopay`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(to right, #16a34a, #059669); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0;">Yetopay</h1>
        <p style="color: #bbf7d0; margin: 8px 0 0;">Bank Health Recovery</p>
      </div>
      <div style="padding: 32px; background: #ffffff;">
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="color: #16a34a; margin: 0 0 8px;">✅ ${bankName} Has Been Re-Enabled</h2>
          <p style="color: #14532d; margin: 0;">Bank code: <strong>${bankCode}</strong></p>
        </div>
        <p style="color: #4b5563; line-height: 1.6;">
          An administrator has re-enabled <strong>${bankName}</strong>. This bank will now appear on payment
          pages again and monitoring has resumed.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <tr style="background: #f9fafb;">
            <td style="padding: 10px 16px; color: #6b7280; font-size: 14px;">Bank</td>
            <td style="padding: 10px 16px; color: #111827; font-weight: 600;">${bankName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 16px; color: #6b7280; font-size: 14px;">Code</td>
            <td style="padding: 10px 16px; color: #111827; font-weight: 600;">${bankCode}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 10px 16px; color: #6b7280; font-size: 14px;">Re-Enabled At</td>
            <td style="padding: 10px 16px; color: #111827; font-weight: 600;">${new Date().toUTCString()}</td>
          </tr>
        </table>
        <p style="color: #4b5563; line-height: 1.6;">
          Please continue to monitor transaction success rates to ensure the bank is operating normally.
        </p>
      </div>
      <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
        &copy; ${new Date().getFullYear()} Yetopay. This is an automated recovery notification.
      </div>
    </div>
  `;

  await transporter.sendMail({ from, to: recipients.join(", "), subject, html });
}
