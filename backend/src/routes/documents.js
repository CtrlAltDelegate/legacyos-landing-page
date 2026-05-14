const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { uploadToS3, getSignedUrl, deleteFromS3 } = require('../services/s3');
const { parseDocument } = require('../services/documentParser');

const router = express.Router();
router.use(authenticate);

// ─── Multer: in-memory storage (files go straight to S3) ──────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted'), false);
    }
  },
});

// ─── GET /api/documents ───────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;

    let sql = `
      SELECT d.id, d.filename, d.original_name, d.doc_type, d.parse_status,
             d.file_size, d.parsed_at, d.confirmed_at, d.notes, d.created_at,
             de.confidence, de.written_to_asset
      FROM documents d
      LEFT JOIN document_extractions de ON de.document_id = d.id
      WHERE d.user_id = $1
    `;
    const params = [req.user.id];

    if (status) {
      params.push(status);
      sql += ` AND d.parse_status = $${params.length}`;
    }

    sql += ` ORDER BY d.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Math.min(parseInt(limit, 10) || 50, 200));
    params.push(parseInt(offset, 10) || 0);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ─── GET /api/documents/:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT d.*, de.raw_extraction, de.confirmed_data, de.confidence, de.written_to_asset
       FROM documents d
       LEFT JOIN document_extractions de ON de.document_id = d.id
       WHERE d.id = $1 AND d.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Document not found' });

    const doc = result.rows[0];
    // Generate a time-limited signed URL for viewing
    try {
      doc.view_url = await getSignedUrl(doc.s3_key);
    } catch {
      doc.view_url = null;
    }

    res.json(doc);
  } catch (err) { next(err); }
});

// ─── POST /api/documents/upload ───────────────────────────────────────────────
router.post('/upload', uploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const { doc_type = 'other', notes = '' } = req.body;

    const validDocTypes = [
      'mortgage_statement', 'brokerage_statement', 'whole_life_statement',
      'tax_return_1040', 'insurance_illustration', 'other',
    ];
    if (!validDocTypes.includes(doc_type)) {
      return res.status(400).json({ error: `Invalid doc_type. Must be one of: ${validDocTypes.join(', ')}` });
    }

    const fileId = uuidv4();
    const ext = path.extname(req.file.originalname) || '.pdf';
    const s3Key = `documents/${req.user.id}/${fileId}${ext}`;

    // Upload to S3
    await uploadToS3({
      key: s3Key,
      body: req.file.buffer,
      contentType: req.file.mimetype,
      metadata: {
        userId: req.user.id,
        originalName: req.file.originalname,
        docType: doc_type,
      },
    });

    // Save document record
    const result = await query(
      `INSERT INTO documents
         (id, user_id, filename, original_name, s3_key, s3_bucket, mime_type, file_size, doc_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        fileId,
        req.user.id,
        `${fileId}${ext}`,
        req.file.originalname,
        s3Key,
        process.env.S3_BUCKET_NAME,
        req.file.mimetype,
        req.file.size,
        doc_type,
        notes,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/documents/:id/parse ────────────────────────────────────────────
router.post('/:id/parse', async (req, res, next) => {
  try {
    // Fetch document
    const docResult = await query(
      `SELECT * FROM documents WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    const doc = docResult.rows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (doc.parse_status === 'parsing') {
      return res.status(409).json({ error: 'Document is already being parsed' });
    }

    // Mark as parsing
    await query(
      `UPDATE documents SET parse_status = 'parsing' WHERE id = $1`,
      [doc.id]
    );

    // Kick off parse (async — we respond immediately)
    (async () => {
      try {
        const extraction = await parseDocument({
          s3Key: doc.s3_key,
          docType: doc.doc_type,
          userId: req.user.id,
        });

        await withTransaction(async (client) => {
          // Upsert extraction
          await client.query(
            `INSERT INTO document_extractions (document_id, user_id, raw_extraction, confidence)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (document_id)
             DO UPDATE SET raw_extraction = EXCLUDED.raw_extraction, confidence = EXCLUDED.confidence, updated_at = NOW()`,
            [doc.id, req.user.id, JSON.stringify(extraction.fields), extraction.confidence]
          );

          await client.query(
            `UPDATE documents SET parse_status = 'parsed', parsed_at = NOW(), parse_error = NULL
             WHERE id = $1`,
            [doc.id]
          );
        });
      } catch (parseErr) {
        console.error('[DocumentParser] Failed:', parseErr.message);
        await query(
          `UPDATE documents SET parse_status = 'failed', parse_error = $1 WHERE id = $2`,
          [parseErr.message, doc.id]
        );
      }
    })();

    res.json({ message: 'Parsing started', document_id: doc.id, status: 'parsing' });
  } catch (err) { next(err); }
});

// ─── POST /api/documents/:id/confirm ─────────────────────────────────────────
// User reviews extracted fields and confirms (or edits) them → writes to assets
router.post('/:id/confirm', async (req, res, next) => {
  try {
    const { confirmed_data, write_to_asset = true } = req.body;

    if (!confirmed_data || typeof confirmed_data !== 'object') {
      return res.status(400).json({ error: 'confirmed_data is required and must be an object' });
    }

    const docResult = await query(
      `SELECT d.*, de.id AS extraction_id, de.raw_extraction
       FROM documents d
       LEFT JOIN document_extractions de ON de.document_id = d.id
       WHERE d.id = $1 AND d.user_id = $2`,
      [req.params.id, req.user.id]
    );
    const doc = docResult.rows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.parse_status !== 'parsed' && doc.parse_status !== 'failed') {
      return res.status(409).json({ error: 'Document must be parsed before confirming' });
    }

    let createdAsset = null;

    await withTransaction(async (client) => {
      // Update extraction with confirmed data
      await client.query(
        `UPDATE document_extractions
         SET confirmed_data = $1, written_to_asset = $2, updated_at = NOW()
         WHERE document_id = $3`,
        [JSON.stringify(confirmed_data), write_to_asset, doc.id]
      );

      // Write to asset tables if requested
      if (write_to_asset && confirmed_data.asset_type) {
        const { asset_type, ...fields } = confirmed_data;

        if (asset_type === 'equity' && fields.ticker) {
          const r = await client.query(
            `INSERT INTO equities (user_id, ticker, name, shares, current_price, account_type, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT DO NOTHING
             RETURNING *`,
            [
              req.user.id, fields.ticker, fields.name, fields.shares,
              fields.current_price, fields.account_type,
              `Auto-created from document: ${doc.original_name}`,
            ]
          );
          createdAsset = r.rows[0];
        } else if (asset_type === 'real_estate' && fields.address) {
          const adjustedValue = (fields.estimated_value || 0) * 0.91;
          const r = await client.query(
            `INSERT INTO real_estate
               (user_id, address, property_type, estimated_value, adjusted_value, adjustment_percent, mortgage_balance, notes)
             VALUES ($1,$2,$3,$4,$5,91,$6,$7)
             RETURNING *`,
            [
              req.user.id, fields.address, fields.property_type || 'primary_residence',
              fields.estimated_value || 0, adjustedValue,
              fields.mortgage_balance || 0,
              `Auto-created from document: ${doc.original_name}`,
            ]
          );
          createdAsset = r.rows[0];
        } else if (asset_type === 'other' && fields.name) {
          const r = await client.query(
            `INSERT INTO other_assets (user_id, name, category, current_value, valuation_method, notes)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [
              req.user.id, fields.name, fields.category || 'other',
              fields.current_value || 0, 'document_parse',
              `Auto-created from document: ${doc.original_name}`,
            ]
          );
          createdAsset = r.rows[0];
        }
      }

      // Mark document as confirmed
      await client.query(
        `UPDATE documents
         SET parse_status = 'confirmed', confirmed_at = NOW(), confirmed_by = $1
         WHERE id = $2`,
        [req.user.id, doc.id]
      );
    });

    res.json({
      message: 'Document confirmed',
      document_id: doc.id,
      created_asset: createdAsset,
    });
  } catch (err) { next(err); }
});

// ─── DELETE /api/documents/:id ────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const docResult = await query(
      `SELECT * FROM documents WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    const doc = docResult.rows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Delete from S3
    try {
      await deleteFromS3(doc.s3_key);
    } catch (s3Err) {
      console.error('[S3] Delete failed:', s3Err.message);
    }

    await query(`DELETE FROM documents WHERE id = $1`, [doc.id]);
    res.json({ message: 'Document deleted' });
  } catch (err) { next(err); }
});

// Handle multer errors
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes('PDF')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// Unique constraint for document_extractions
// Add to schema: CREATE UNIQUE INDEX ON document_extractions(document_id);
// This is handled by the INSERT...ON CONFLICT above.

module.exports = router;
