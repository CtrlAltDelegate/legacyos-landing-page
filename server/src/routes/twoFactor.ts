import { Router, Request, Response } from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const APP_NAME = 'LegacyOS';

// ─── POST /api/2fa/setup ──────────────────────────────────────────────────────
// Generate a TOTP secret and return QR code + backup codes.
// Does NOT enable 2FA yet — user must verify first.

router.post('/setup', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) { res.status(404).json({ error: 'User not found.' }); return; }
    if (user.twoFactorEnabled) {
      res.status(400).json({ error: '2FA is already enabled. Disable it first.' });
      return;
    }

    const secretObj = speakeasy.generateSecret({ name: `${APP_NAME} (${user.email})`, length: 20 });
    const secret = secretObj.base32;
    const otpauthUrl = secretObj.otpauth_url ?? speakeasy.otpauthURL({ secret, label: user.email, issuer: APP_NAME, encoding: 'base32' });
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    // Generate 8 backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Store secret temporarily (not yet enabled)
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { twoFactorSecret: secret, twoFactorBackupCodes: backupCodes },
    });

    res.json({ secret, qrCode, backupCodes });
  } catch (err) {
    console.error('[2fa/setup]', err);
    res.status(500).json({ error: 'Failed to set up 2FA.' });
  }
});

// ─── POST /api/2fa/enable ─────────────────────────────────────────────────────
// Verify the TOTP code from the user's authenticator app, then enable 2FA.

router.post('/enable', async (req: Request, res: Response) => {
  const { code } = req.body as { code?: string };
  if (!code) { res.status(400).json({ error: 'Code is required.' }); return; }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorSecret) {
      res.status(400).json({ error: 'No 2FA setup in progress. Call /setup first.' });
      return;
    }

    const valid = speakeasy.totp.verify({ token: code, secret: user.twoFactorSecret, encoding: 'base32', window: 1 });
    if (!valid) {
      res.status(400).json({ error: 'Invalid code. Please try again.' });
      return;
    }

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { twoFactorEnabled: true },
    });

    res.json({ message: '2FA enabled successfully.' });
  } catch (err) {
    console.error('[2fa/enable]', err);
    res.status(500).json({ error: 'Failed to enable 2FA.' });
  }
});

// ─── POST /api/2fa/disable ────────────────────────────────────────────────────
// Disable 2FA. Requires the current TOTP code for confirmation.

router.post('/disable', async (req: Request, res: Response) => {
  const { code } = req.body as { code?: string };
  if (!code) { res.status(400).json({ error: 'Code is required.' }); return; }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      res.status(400).json({ error: '2FA is not enabled.' });
      return;
    }

    const valid = speakeasy.totp.verify({ token: code, secret: user.twoFactorSecret, encoding: 'base32', window: 1 });
    if (!valid) {
      res.status(400).json({ error: 'Invalid code.' });
      return;
    }

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] },
    });

    res.json({ message: '2FA disabled.' });
  } catch (err) {
    console.error('[2fa/disable]', err);
    res.status(500).json({ error: 'Failed to disable 2FA.' });
  }
});

// ─── POST /api/2fa/verify ─────────────────────────────────────────────────────
// Called during login when user has 2FA enabled.
// Exchange a temporary pre-2FA token + TOTP code for full tokens.

router.post('/verify', async (req: Request, res: Response) => {
  const { code } = req.body as { code?: string };
  if (!code) { res.status(400).json({ error: 'Code is required.' }); return; }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true, twoFactorBackupCodes: true },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      res.status(400).json({ error: '2FA is not enabled for this account.' });
      return;
    }

    // Check TOTP code first
    const totpValid = speakeasy.totp.verify({ token: code, secret: user.twoFactorSecret, encoding: 'base32', window: 1 });

    // Then check backup codes
    let usedBackupCode = false;
    if (!totpValid) {
      const normalised = code.replace(/\s/g, '').toUpperCase();
      const idx = user.twoFactorBackupCodes.indexOf(normalised);
      if (idx !== -1) {
        // Consume the backup code
        const remaining = user.twoFactorBackupCodes.filter((_, i) => i !== idx);
        await prisma.user.update({
          where: { id: req.user!.userId },
          data: { twoFactorBackupCodes: remaining },
        });
        usedBackupCode = true;
      }
    }

    if (!totpValid && !usedBackupCode) {
      res.status(400).json({ error: 'Invalid code.' });
      return;
    }

    res.json({ verified: true, usedBackupCode });
  } catch (err) {
    console.error('[2fa/verify]', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// ─── GET /api/2fa/status ──────────────────────────────────────────────────────

router.get('/status', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { twoFactorEnabled: true, twoFactorBackupCodes: true },
    });
    res.json({
      enabled: user?.twoFactorEnabled ?? false,
      backupCodesRemaining: user?.twoFactorBackupCodes.length ?? 0,
    });
  } catch (err) {
    console.error('[2fa/status]', err);
    res.status(500).json({ error: 'Failed to get 2FA status.' });
  }
});

export default router;
