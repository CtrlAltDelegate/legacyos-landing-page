import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.EMAIL_FROM ?? 'LegacyOS <noreply@legacyos.com>';
const CLIENT = process.env.CLIENT_URL ?? 'http://localhost:5173';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function baseHtml(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F8F8FB;margin:0;padding:40px 16px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#3a47ec;padding:24px 32px;">
      <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.5px;">LegacyOS</span>
    </div>
    <div style="padding:32px;">
      ${body}
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">You received this email because you have a LegacyOS account. If you didn't request this, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Send verification email ──────────────────────────────────────────────────

export async function sendVerificationEmail(
  to: string,
  token: string,
): Promise<void> {
  const link = `${CLIENT}/verify-email?token=${token}`;

  const html = baseHtml('Verify your email — LegacyOS', `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Verify your email address</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
      Click the button below to verify your email and activate your LegacyOS account.
      This link expires in 24 hours.
    </p>
    <a href="${link}" style="display:inline-block;background:#3a47ec;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
      Verify email address
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
      Or copy this link: ${link}
    </p>
  `);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[email] RESEND_API_KEY not set — verification link: ${link}`);
    return;
  }

  await resend.emails.send({ from: FROM, to, subject: 'Verify your LegacyOS email', html });
}

// ─── Send password reset email ────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  to: string,
  token: string,
): Promise<void> {
  const link = `${CLIENT}/reset-password?token=${token}`;

  const html = baseHtml('Reset your password — LegacyOS', `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Reset your password</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
      We received a request to reset the password for your LegacyOS account.
      Click below to choose a new password. This link expires in 1 hour.
    </p>
    <a href="${link}" style="display:inline-block;background:#3a47ec;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
      Reset password
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
      Or copy this link: ${link}
    </p>
    <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
      If you didn't request this, your password won't change. You can safely ignore this email.
    </p>
  `);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[email] RESEND_API_KEY not set — reset link: ${link}`);
    return;
  }

  await resend.emails.send({ from: FROM, to, subject: 'Reset your LegacyOS password', html });
}
