import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

function generateCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F7C12E"
}

// ─── GET /api/referral/code ───────────────────────────────────────────────────
// Get or create the user's referral code.

router.get('/code', async (req: Request, res: Response) => {
  try {
    let user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { referralCode: true },
    });

    if (!user) { res.status(404).json({ error: 'User not found.' }); return; }

    // Generate code if they don't have one yet
    if (!user.referralCode) {
      let code = generateCode();
      // Ensure uniqueness (extremely unlikely collision but handle it)
      while (await prisma.user.findUnique({ where: { referralCode: code } })) {
        code = generateCode();
      }
      await prisma.user.update({ where: { id: req.user!.userId }, data: { referralCode: code } });
      user = { referralCode: code };
    }

    const count = await prisma.referral.count({ where: { referrerId: req.user!.userId } });
    const clientUrl = process.env.CLIENT_URL ?? 'https://app.legacyos.com';

    res.json({
      code: user.referralCode,
      link: `${clientUrl}/register?ref=${user.referralCode}`,
      referralCount: count,
    });
  } catch (err) {
    console.error('[referral/code]', err);
    res.status(500).json({ error: 'Failed to get referral code.' });
  }
});

export default router;
