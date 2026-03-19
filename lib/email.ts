import nodemailer from "nodemailer";

const isProd = process.env.NODE_ENV === "production";
const port = Number(process.env.SMTP_PORT) || (isProd ? 587 : 2525);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || (isProd ? "smtp.resend.com" : "sandbox.smtp.mailtrap.io"),
  port,
  secure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const from = `${process.env.SMTP_FROM_NAME || "FyroPay"} <${process.env.SMTP_FROM || "noreply@onegate.co.za"}>`;

export async function sendVerificationEmail(email: string, url: string) {
  await transporter.sendMail({
    from,
    to: email,
    subject: "Verify your email - FyroPay",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(140deg, #C8941A 0%, #0f1629 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0;">FyroPay</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <h2 style="color: #1f2937;">Verify your email address</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Thanks for signing up! Please verify your email address by clicking the button below.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${url}" style="background-color: #C8941A; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 14px;">
            If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
        <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
          &copy; ${new Date().getFullYear()} FyroPay. All rights reserved.
        </div>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, url: string) {
  await transporter.sendMail({
    from,
    to: email,
    subject: "Reset your password - FyroPay",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(140deg, #C8941A 0%, #0f1629 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0;">FyroPay</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <h2 style="color: #1f2937;">Reset your password</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            We received a request to reset your password. Click the button below to choose a new password.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${url}" style="background-color: #C8941A; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 14px;">
            If you didn't request a password reset, you can safely ignore this email. This link will expire in 1 hour.
          </p>
        </div>
        <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
          &copy; ${new Date().getFullYear()} FyroPay. All rights reserved.
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
  const subject = `🚨 Bank Auto-Disabled: ${bankName} — FyroPay Alert`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(to right, #dc2626, #b91c1c); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0;">FyroPay</h1>
        <p style="color: #fecaca; margin: 8px 0 0;">Bank Health Alert</p>
      </div>
      <div style="padding: 32px; background: #ffffff;">
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="color: #dc2626; margin: 0 0 8px;">⚠️ ${bankName} Has Been Automatically Disabled</h2>
          <p style="color: #7f1d1d; margin: 0;">Bank code: <strong>${bankCode}</strong></p>
        </div>
        <p style="color: #4b5563; line-height: 1.6;">
          The FyroPay monitoring system detected <strong>${failureCount} consecutive failed transactions</strong>
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
        &copy; ${new Date().getFullYear()} FyroPay. This is an automated alert from the bank health monitoring system.
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
  const subject = `✅ Bank Recovered: ${bankName} — FyroPay`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(140deg, #C8941A 0%, #0f1629 100%); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0;">FyroPay</h1>
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
        &copy; ${new Date().getFullYear()} FyroPay. This is an automated recovery notification.
      </div>
    </div>
  `;

  await transporter.sendMail({ from, to: recipients.join(", "), subject, html });
}

// ─── Partner Email Templates ─────────────────────────────────────────────────

export async function sendPartnerInvitationEmail(email: string, invitationLink: string) {
  await transporter.sendMail({
    from,
    to: email,
    subject: "You've been invited to join FyroPay as a Partner",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(140deg, #C8941A 0%, #0f1629 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0;">FyroPay</h1>
          <p style="color: #ddd6fe; margin: 8px 0 0;">Partner Invitation</p>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <h2 style="color: #1f2937;">You're invited to become a Partner</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            You've been invited to join FyroPay as a partner. As a partner, you'll be able to
            manage merchants, view transactions across your merchant network, and earn commissions.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${invitationLink}" style="background-color: #0f1629; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 14px;">
            This invitation link will expire in 7 days. If you didn't expect this email, you can safely ignore it.
          </p>
        </div>
        <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
          &copy; ${new Date().getFullYear()} FyroPay. All rights reserved.
        </div>
      </div>
    `,
  });
}

export async function sendMerchantInvitedByPartnerEmail(
  email: string,
  invitationLink: string,
  partnerCompanyName: string
) {
  await transporter.sendMail({
    from,
    to: email,
    subject: `You've been invited to join FyroPay by ${partnerCompanyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(140deg, #C8941A 0%, #0f1629 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0;">FyroPay</h1>
          <p style="color: #bbf7d0; margin: 8px 0 0;">Merchant Invitation</p>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <h2 style="color: #1f2937;">You're invited by ${partnerCompanyName}</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            <strong>${partnerCompanyName}</strong> has invited you to join FyroPay as a merchant.
            Accept the invitation to set up your account and start accepting EFT payments.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${invitationLink}" style="background-color: #C8941A; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 14px;">
            This invitation link will expire in 7 days. If you didn't expect this email, you can safely ignore it.
          </p>
        </div>
        <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
          &copy; ${new Date().getFullYear()} FyroPay. All rights reserved.
        </div>
      </div>
    `,
  });
}

export async function sendPartnerActionNotificationEmail(
  recipients: string[],
  partnerName: string,
  action: string,
  details: Record<string, string>
) {
  const detailRows = Object.entries(details)
    .map(([key, value], i) => `
      <tr style="background: ${i % 2 === 0 ? '#f9fafb' : '#ffffff'};">
        <td style="padding: 10px 16px; color: #6b7280; font-size: 14px;">${key}</td>
        <td style="padding: 10px 16px; color: #111827; font-weight: 600;">${value}</td>
      </tr>
    `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(to right, #d97706, #b45309); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0;">FyroPay</h1>
        <p style="color: #fef3c7; margin: 8px 0 0;">Partner Action Alert</p>
      </div>
      <div style="padding: 32px; background: #ffffff;">
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="color: #d97706; margin: 0 0 8px;">Partner Action: ${action}</h2>
          <p style="color: #92400e; margin: 0;">By: <strong>${partnerName}</strong></p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          ${detailRows}
          <tr style="background: #f9fafb;">
            <td style="padding: 10px 16px; color: #6b7280; font-size: 14px;">Timestamp</td>
            <td style="padding: 10px 16px; color: #111827; font-weight: 600;">${new Date().toUTCString()}</td>
          </tr>
        </table>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/admin/partners"
            style="background-color: #d97706; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Partners Dashboard
          </a>
        </div>
      </div>
      <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
        &copy; ${new Date().getFullYear()} FyroPay. Automated partner activity notification.
      </div>
    </div>
  `;

  await transporter.sendMail({
    from,
    to: recipients.join(", "),
    subject: `Partner Action: ${partnerName} — ${action}`,
    html,
  });
}
