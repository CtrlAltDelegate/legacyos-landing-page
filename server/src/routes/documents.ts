import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requirePlan } from '../middleware/planGate';
import { uploadToS3, getPresignedUrl, deleteFromS3 } from '../services/s3';
import { parseDocument, checkForAnomalies } from '../services/papertrail/index';
import { DocumentType, ParsedData } from '../services/papertrail/types';

const router = Router();
router.use(requireAuth);

// Multer — store upload in memory, 10MB limit, PDF only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted.'));
    }
  },
});

// ─── GET /api/documents ───────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const documents = await prisma.document.findMany({
      where: { userId: req.user!.userId },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        filename: true,
        documentType: true,
        parseStatus: true,
        uploadedAt: true,
        confirmedAt: true,
        relatedAssetId: true,
        parseError: true,
      },
    });

    res.json({ documents });
  } catch (err) {
    console.error('[documents GET /]', err);
    res.status(500).json({ error: 'Failed to fetch documents.' });
  }
});

// ─── POST /api/documents/upload ───────────────────────────────────────────────
// Core plan required — document parsing is a paid feature

router.post(
  '/upload',
  requirePlan('core'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }

    const { documentType = 'unknown', relatedAssetId } = req.body;

    try {
      // Build a unique S3 key: users/{userId}/documents/{uuid}.pdf
      const s3Key = `users/${req.user!.userId}/documents/${uuidv4()}.pdf`;

      await uploadToS3(s3Key, req.file.buffer, 'application/pdf');

      const document = await prisma.document.create({
        data: {
          userId: req.user!.userId,
          filename: req.file.originalname,
          s3Key,
          documentType: documentType as DocumentType,
          parseStatus: 'pending',
          relatedAssetId: relatedAssetId ?? null,
        },
      });

      res.status(201).json({
        document,
        message: 'Document uploaded. Call /parse to extract data.',
      });
    } catch (err) {
      console.error('[documents/upload]', err);
      res.status(500).json({ error: 'Upload failed.' });
    }
  }
);

// ─── POST /api/documents/:id/parse ────────────────────────────────────────────
// Trigger Claude API extraction. Does NOT write to assets — awaits user confirmation.

router.post('/:id/parse', requirePlan('core'), async (req: Request, res: Response) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    if (document.parseStatus === 'confirmed') {
      res.status(409).json({ error: 'Document already confirmed.' });
      return;
    }

    // Mark as parsing
    await prisma.document.update({
      where: { id: document.id },
      data: { parseStatus: 'parsing', parseError: null },
    });

    // Run PaperTrail extraction
    const result = await parseDocument(
      document.s3Key,
      (document.documentType as DocumentType) ?? 'unknown'
    );

    // Store raw extraction, set awaiting_confirmation
    const updated = await prisma.document.update({
      where: { id: document.id },
      data: {
        parseStatus: 'awaiting_confirmation',
        parsedData: result.parsedData as object,
      },
    });

    res.json({
      document: updated,
      parsedData: result.parsedData,
      confidence: result.confidence,
      message: 'Extraction complete. Review the values and confirm to save.',
    });
  } catch (err) {
    console.error('[documents/parse]', err);

    // Mark as failed so user can retry
    await prisma.document.update({
      where: { id: req.params.id },
      data: {
        parseStatus: 'failed',
        parseError: err instanceof Error ? err.message : 'Unknown parse error',
      },
    }).catch(() => {}); // swallow update error

    res.status(500).json({ error: 'Document parsing failed. Please try again.' });
  }
});

// ─── GET /api/documents/:id/parsed ────────────────────────────────────────────
// Return parsed data for the confirmation UI

router.get('/:id/parsed', async (req: Request, res: Response) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      select: {
        id: true,
        filename: true,
        documentType: true,
        parseStatus: true,
        parsedData: true,
        confirmedData: true,
        relatedAssetId: true,
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    if (!document.parsedData) {
      res.status(400).json({ error: 'Document has not been parsed yet.' });
      return;
    }

    // If there's a related asset, fetch its current value for side-by-side comparison
    let currentAssetValue: number | null = null;
    if (document.relatedAssetId) {
      const asset = await prisma.asset.findUnique({
        where: { id: document.relatedAssetId },
        select: { currentValue: true, estimatedValue: true, assetClass: true },
      });
      if (asset) {
        currentAssetValue = Number(
          asset.assetClass === 'real_estate' ? asset.estimatedValue : asset.currentValue
        );
      }
    }

    res.json({ document, currentAssetValue });
  } catch (err) {
    console.error('[documents/parsed GET]', err);
    res.status(500).json({ error: 'Failed to fetch parsed data.' });
  }
});

// ─── POST /api/documents/:id/confirm ─────────────────────────────────────────
// User confirms (and optionally edits) extracted values → writes to asset record.
// CRITICAL: This is the ONLY place that writes parsed data to an asset.

router.post('/:id/confirm', requirePlan('core'), async (req: Request, res: Response) => {
  const { confirmedData, assetId } = req.body as {
    confirmedData: ParsedData;
    assetId?: string;
  };

  if (!confirmedData) {
    res.status(400).json({ error: 'confirmedData is required.' });
    return;
  }

  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    if (document.parseStatus === 'confirmed') {
      res.status(409).json({ error: 'Document already confirmed.' });
      return;
    }

    // Resolve which asset to update
    const targetAssetId = assetId ?? document.relatedAssetId;

    let previousValue: number | null = null;
    let anomalyFlags: ReturnType<typeof checkForAnomalies> = [];

    if (targetAssetId) {
      const asset = await prisma.asset.findFirst({
        where: { id: targetAssetId, userId: req.user!.userId },
      });

      if (!asset) {
        res.status(404).json({ error: 'Related asset not found.' });
        return;
      }

      // Capture previous value for anomaly detection
      previousValue = Number(
        asset.assetClass === 'real_estate' ? asset.estimatedValue : asset.currentValue
      );

      // Write confirmed values to the asset based on document type
      const assetUpdates = buildAssetUpdates(
        document.documentType as DocumentType,
        confirmedData
      );

      if (Object.keys(assetUpdates).length > 0) {
        await prisma.asset.update({
          where: { id: targetAssetId },
          data: {
            ...assetUpdates,
            currentValueSource: 'document_parse',
            currentValueUpdatedAt: new Date(),
          },
        });

        // Append to asset_history — append only, never delete
        const historyValue = getConfirmedValue(document.documentType as DocumentType, confirmedData);
        if (historyValue != null) {
          await prisma.assetHistory.create({
            data: {
              assetId: targetAssetId,
              userId: req.user!.userId,
              value: historyValue,
              valueSource: 'user_confirmed',
              sourceDocumentId: document.id,
              note: `Confirmed from ${document.filename}`,
            },
          });
        }
      }

      // Check for anomalies against previous value
      anomalyFlags = checkForAnomalies(
        document.documentType as DocumentType,
        confirmedData,
        previousValue
      );
    }

    // Mark document as confirmed
    await prisma.document.update({
      where: { id: document.id },
      data: {
        parseStatus: 'confirmed',
        confirmedData: confirmedData as object,
        confirmedAt: new Date(),
      },
    });

    res.json({
      message: 'Confirmed. Asset record updated.',
      anomalyFlags,
      hasAnomalies: anomalyFlags.length > 0,
    });
  } catch (err) {
    console.error('[documents/confirm]', err);
    res.status(500).json({ error: 'Confirmation failed.' });
  }
});

// ─── GET /api/documents/:id/download ─────────────────────────────────────────
// Return a short-lived presigned S3 URL to view the original PDF

router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      select: { s3Key: true, filename: true },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    const url = await getPresignedUrl(document.s3Key, 900); // 15 min
    res.json({ url, filename: document.filename });
  } catch (err) {
    console.error('[documents/download]', err);
    res.status(500).json({ error: 'Failed to generate download link.' });
  }
});

// ─── DELETE /api/documents/:id ────────────────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    // Delete from S3 first, then DB
    await deleteFromS3(document.s3Key);
    await prisma.document.delete({ where: { id: document.id } });

    res.json({ message: 'Document deleted.' });
  } catch (err) {
    console.error('[documents DELETE]', err);
    res.status(500).json({ error: 'Failed to delete document.' });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Map confirmed document data to asset table fields.
 * Each document type updates different asset columns.
 */
function buildAssetUpdates(
  documentType: DocumentType,
  data: ParsedData
): Record<string, unknown> {
  const d = data as Record<string, unknown>;

  switch (documentType) {
    case 'mortgage_statement':
      return {
        ...(d.remaining_balance != null && { mortgageBalance: d.remaining_balance }),
        ...(d.monthly_payment != null && { monthlyPiti: d.monthly_payment }),
        ...(d.estimated_value != null && {
          estimatedValue: d.estimated_value,
          adjustedValue: parseFloat((Number(d.estimated_value) * 0.91).toFixed(2)),
        }),
      };

    case 'brokerage_statement':
      return {
        ...(d.total_value != null && { currentValue: d.total_value }),
      };

    case 'whole_life_statement':
      return {
        ...(d.cash_surrender_value != null && { currentValue: d.cash_surrender_value }),
      };

    default:
      return {};
  }
}

/**
 * Get the primary numeric value from confirmed data for asset_history.
 */
function getConfirmedValue(documentType: DocumentType, data: ParsedData): number | null {
  const d = data as Record<string, unknown>;

  switch (documentType) {
    case 'mortgage_statement':
      return d.remaining_balance != null ? Number(d.remaining_balance) : null;
    case 'brokerage_statement':
      return d.total_value != null ? Number(d.total_value) : null;
    case 'whole_life_statement':
      return d.cash_surrender_value != null ? Number(d.cash_surrender_value) : null;
    default:
      return null;
  }
}

export default router;
