// =============================================================================
// TaxAce — Email Helper
// Sends transactional emails via SMTP (configured via SMTP_* env vars).
// Falls back to console logging in development when SMTP is not configured.
// =============================================================================

import nodemailer from "nodemailer";

interface ResetEmailOptions {
  to: string;
  name: string;
  token: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? "noreply@taxace.com";

  if (!host || !user || !pass) {
    // Development fallback — log to console
    return { transporter: null, from };
  }

  return {
    transporter: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }),
    from,
  };
}

export async function sendPasswordResetEmail({ to, name, token }: ResetEmailOptions): Promise<void> {
  const appUrl = process.env.APP_URL ?? "https://taxpreparers.taxace.io";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  const { transporter, from } = getTransporter();

  const subject = "TaxAce Dashboard — Password Reset";
  const html = `
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background: #1a3d2b; padding: 28px 32px;">
        <p style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 700; color: #f5f0e8; margin: 0;">TaxAce Group</p>
        <p style="font-size: 11px; color: #6b9e7e; letter-spacing: 0.1em; text-transform: uppercase; margin: 4px 0 0;">Tax Prep Operations</p>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 16px; color: #1a3d2b; margin: 0 0 16px;">Hi ${name},</p>
        <p style="font-size: 14px; color: #374151; line-height: 1.6; margin: 0 0 24px;">
          A password reset was requested for your TaxAce Dashboard account. Click the button below to set a new password. This link expires in <strong>15 minutes</strong>.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #1a3d2b; color: #f5f0e8; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; text-decoration: none;">Reset My Password</a>
        <p style="font-size: 12px; color: #9ca3af; margin: 24px 0 0; line-height: 1.5;">
          If you did not request this, you can safely ignore this email. Your password will not change.<br><br>
          For security questions, contact <a href="mailto:nataly@taxace.com" style="color: #1a3d2b;">nataly@taxace.com</a>.
        </p>
      </div>
    </div>
  `;

  if (!transporter) {
    // Dev mode — print to console
    console.log(`\n[EMAIL] Password reset for ${to}\nReset URL: ${resetUrl}\n`);
    return;
  }

  await transporter.sendMail({ from, to, subject, html });
}
