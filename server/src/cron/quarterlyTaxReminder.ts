import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { sendQuarterlyTaxReminder } from '../services/email';

// IRS estimated tax due dates — we send 14 days before each.
// Cron fires at 8am on: Jan 1 (→ Jan 15), Apr 1 (→ Apr 15), Jun 1 (→ Jun 15), Sep 1 (→ Sep 15)
const QUARTER_INFO: Record<number, { quarter: string; dueDate: string }> = {
  1:  { quarter: 'Q4 (prior year)', dueDate: 'January 15' },
  4:  { quarter: 'Q1',              dueDate: 'April 15'   },
  6:  { quarter: 'Q2',              dueDate: 'June 15'    },
  9:  { quarter: 'Q3',              dueDate: 'September 15' },
};

async function sendQuarterlyReminders(): Promise<void> {
  const month = new Date().getMonth() + 1; // 1-12
  const info = QUARTER_INFO[month];
  if (!info) return; // shouldn't happen given schedule

  console.log(`[quarterlyTax] Sending ${info.quarter} reminders (due ${info.dueDate})`);

  let sent = 0;
  let skipped = 0;

  try {
    // Send to users who are self-employed OR have confirmed a tax return
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        familyProfile: { select: { answers: true } },
        documents: {
          where: { documentType: 'tax_return', parseStatus: 'confirmed' },
          orderBy: { confirmedAt: 'desc' },
          take: 1,
          select: { parsedData: true },
        },
      },
    });

    for (const user of users) {
      const answers = user.familyProfile?.answers as Record<string, unknown> | null;
      const isSelfEmployed =
        answers?.is_self_employed === true || answers?.is_self_employed === 'true';

      const hasTaxReturn = user.documents.length > 0;

      if (!isSelfEmployed && !hasTaxReturn) {
        skipped++;
        continue;
      }

      // Derive estimated quarterly payment from most recent tax return
      let estimatedPayment: number | null = null;
      const latestTaxDoc = user.documents[0];
      if (latestTaxDoc?.parsedData) {
        const d = latestTaxDoc.parsedData as Record<string, unknown>;
        const agi = Number(d.adjusted_gross_income ?? 0);
        const fedTax = Number(d.federal_tax_owed ?? 0);
        const stateTax = Number(d.state_tax_owed ?? 0);
        const totalTax = fedTax + stateTax;
        if (agi > 0 && totalTax > 0) {
          estimatedPayment = Math.round(totalTax / 4);
        }
      }

      await sendQuarterlyTaxReminder(
        user.email,
        user.fullName ?? '',
        info.quarter,
        info.dueDate,
        estimatedPayment,
      ).catch((e) => console.error(`[quarterlyTax] Email failed for ${user.id}:`, e));

      sent++;
    }

    console.log(`[quarterlyTax] Done. Sent: ${sent}, Skipped: ${skipped}`);
  } catch (err) {
    console.error('[quarterlyTax] Fatal error:', err);
  }
}

/**
 * Quarterly tax reminder cron — fires at 8am on Jan 1, Apr 1, Jun 1, Sep 1.
 * Sends reminders ~14 days before each IRS estimated tax deadline.
 * Only sends to self-employed users or users with a confirmed tax return.
 */
export function startQuarterlyTaxReminderCron(): void {
  cron.schedule('0 8 1 1,4,6,9 *', async () => {
    console.log('[quarterlyTax] Cron triggered at', new Date().toISOString());
    await sendQuarterlyReminders();
  }, {
    timezone: 'America/New_York',
  });

  console.log('[quarterlyTax] Quarterly tax reminder cron scheduled (1st of Jan/Apr/Jun/Sep, 08:00 ET)');
}
