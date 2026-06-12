import { Resend } from 'resend';

// Lazy client — avoids crashing on startup when RESEND_API_KEY is not yet set
function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured.');
  }
  return new Resend(process.env.RESEND_API_KEY);
}

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

  await getResend().emails.send({ from: FROM, to, subject: 'Verify your LegacyOS email', html });
}

// ─── Send document parse failure email ───────────────────────────────────────

export async function sendDocumentParseFailed(
  to: string,
  filename: string,
): Promise<void> {
  const html = baseHtml('Document extraction failed — LegacyOS', `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">We couldn't extract data from your document</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6;">
      We were unable to automatically extract financial data from <strong>${filename}</strong>.
      This can happen with scanned documents, password-protected PDFs, or unusual formatting.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
      You can retry the extraction from PaperTrail, or try uploading a clearer copy of the document.
    </p>
    <a href="${CLIENT}/documents" style="display:inline-block;background:#3a47ec;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
      Go to PaperTrail
    </a>
  `);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[email] RESEND_API_KEY not set — skipping parse failed email for ${filename}`);
    return;
  }

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Couldn't extract data from ${filename}`,
    html,
  });
}

// ─── Net worth milestone email ────────────────────────────────────────────────

const MILESTONE_LABELS: Record<number, string> = {
  100_000:   '$100,000',
  250_000:   '$250,000',
  500_000:   '$500,000',
  1_000_000: '$1,000,000',
};

export async function sendNetWorthMilestone(
  to: string,
  fullName: string,
  milestone: number,
): Promise<void> {
  const label = MILESTONE_LABELS[milestone] ?? `$${milestone.toLocaleString()}`;
  const firstName = fullName.split(' ')[0] ?? fullName;

  const html = baseHtml(`You hit ${label} net worth! — LegacyOS`, `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">🎉 ${label} — milestone unlocked</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Congratulations, ${firstName}! Your net worth just crossed <strong>${label}</strong>. That's a significant milestone.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
      This is a good time to review your asset allocation, check your beneficiary designations,
      and consider whether your insurance coverage still matches your wealth level.
      Ask Flo for a personalized next-step recommendation.
    </p>
    <a href="${CLIENT}/flo" style="display:inline-block;background:#3a47ec;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
      Ask Flo what to do next
    </a>
  `);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[email] RESEND_API_KEY not set — skipping milestone email for ${to} (${label})`);
    return;
  }

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `🎉 You hit ${label} net worth`,
    html,
  });
}

// ─── Quarterly tax reminder email ─────────────────────────────────────────────

export async function sendQuarterlyTaxReminder(
  to: string,
  fullName: string,
  quarter: string,
  dueDate: string,
  estimatedPayment: number | null,
): Promise<void> {
  const firstName = fullName.split(' ')[0] ?? fullName;
  const paymentLine = estimatedPayment != null
    ? `<p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6;">Based on your last confirmed tax return, your estimated quarterly payment is approximately <strong>$${Math.round(estimatedPayment).toLocaleString()}</strong>.</p>`
    : '';

  const html = baseHtml(`Quarterly tax reminder — ${quarter} due ${dueDate}`, `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">⏰ Quarterly estimated tax — ${quarter}</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6;">
      Hi ${firstName}, your next estimated tax payment is due on <strong>${dueDate}</strong>.
    </p>
    ${paymentLine}
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
      Pay via the IRS Direct Pay portal or EFTPS. Missing a quarterly payment can result in underpayment penalties.
      Always consult your CPA for amounts specific to your situation.
    </p>
    <a href="${CLIENT}/flo" style="display:inline-block;background:#3a47ec;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
      Review tax context with Flo
    </a>
  `);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[email] RESEND_API_KEY not set — skipping quarterly tax reminder for ${to}`);
    return;
  }

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `⏰ Quarterly estimated tax due ${dueDate}`,
    html,
  });
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

  await getResend().emails.send({ from: FROM, to, subject: 'Reset your LegacyOS password', html });
}
