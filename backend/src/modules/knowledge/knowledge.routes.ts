import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess, sendError } from '../../shared/helpers/response';
import {
  getDocument,
  listDocuments,
  deleteDocument,
  getChunksForDocument,
} from './knowledge.repository';
import { ingestDocument, semanticSearch, chunkText } from './knowledge.service';

export const knowledgeRouter = Router();

// ── Multer for optional file upload (text/plain, max 10 MB) ──────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only plain-text (.txt) files are supported'));
    }
  },
});

// ── GET /api/knowledge/documents ─────────────────────────────────────────────

knowledgeRouter.get(
  '/documents',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const filter: { institution_id?: string; program_id?: string } = {};

      // Scope results by role: SUPER_ADMIN/PROGRAM_ADMIN see their college only
      // PLATFORM_OWNER and STUDENT see global documents
      if (
        (user.role === 'SUPER_ADMIN' || user.role === 'PROGRAM_ADMIN') &&
        req.query.institution_id
      ) {
        filter.institution_id = String(req.query.institution_id);
      }
      if (req.query.program_id) {
        filter.program_id = String(req.query.program_id);
      }

      const docs = await listDocuments(filter);
      sendSuccess(res, docs);
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ── POST /api/knowledge/documents ────────────────────────────────────────────

const ingestJsonSchema = z.object({
  title: z.string().min(1).max(255),
  text: z.string().min(1),
  source_type: z.string().max(50).optional(),
  source_url: z.string().url().max(500).optional(),
  visibility_type: z.enum(['GLOBAL', 'INSTITUTION', 'PROGRAM', 'SUBDIVISION']).optional(),
  institution_id: z.string().uuid().optional(),
  program_id: z.string().uuid().optional(),
  subdivision_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// JSON body ingestion
knowledgeRouter.post(
  '/documents',
  authenticate,
  requireRole('PROGRAM_ADMIN', 'SUPER_ADMIN', 'PLATFORM_OWNER'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = ingestJsonSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, new AppError(422, 'Validation failed', 'VALIDATION_ERROR'));
      return;
    }
    try {
      const result = await ingestDocument(parsed.data);
      sendSuccess(res, result, 201);
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ── POST /api/knowledge/documents/upload ─────────────────────────────────────

// File upload ingestion (multipart/form-data, text/plain only)
knowledgeRouter.post(
  '/documents/upload',
  authenticate,
  requireRole('PROGRAM_ADMIN', 'SUPER_ADMIN', 'PLATFORM_OWNER'),
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        sendError(res, new AppError(400, err instanceof Error ? err.message : 'Upload failed', 'UPLOAD_ERROR'));
        return;
      }
      next();
    });
  },
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.file) {
      sendError(res, new AppError(400, 'No file uploaded', 'MISSING_FILE'));
      return;
    }
    const title = String(req.body.title || req.file.originalname.replace(/\.txt$/, '')).slice(0, 255);
    const text = req.file.buffer.toString('utf8');
    if (!text.trim()) {
      sendError(res, new AppError(400, 'Uploaded file is empty', 'EMPTY_FILE'));
      return;
    }
    try {
      const result = await ingestDocument({
        title,
        text,
        source_type: 'FILE',
        visibility_type: (req.body.visibility_type as string) ?? 'GLOBAL',
        institution_id: req.body.institution_id,
        program_id: req.body.program_id,
        metadata: { original_filename: req.file.originalname },
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ── GET /api/knowledge/documents/:id ─────────────────────────────────────────

knowledgeRouter.get(
  '/documents/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const doc = await getDocument(String(req.params.id));
      if (!doc) throw new AppError(404, 'Document not found', 'NOT_FOUND');
      sendSuccess(res, doc);
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ── GET /api/knowledge/documents/:id/chunks ───────────────────────────────────

knowledgeRouter.get(
  '/documents/:id/chunks',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const chunks = await getChunksForDocument(String(req.params.id));
      sendSuccess(res, chunks);
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ── DELETE /api/knowledge/documents/:id ──────────────────────────────────────

knowledgeRouter.delete(
  '/documents/:id',
  authenticate,
  requireRole('PROGRAM_ADMIN', 'SUPER_ADMIN', 'PLATFORM_OWNER'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const deleted = await deleteDocument(String(req.params.id));
      if (!deleted) throw new AppError(404, 'Document not found', 'NOT_FOUND');
      sendSuccess(res, { deleted: true });
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ── POST /api/knowledge/search ────────────────────────────────────────────────

const searchSchema = z.object({
  query: z.string().min(1).max(2000),
  limit: z.coerce.number().int().min(1).max(20).default(5),
  institution_id: z.string().uuid().optional(),
  program_id: z.string().uuid().optional(),
});

knowledgeRouter.post(
  '/search',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = searchSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, new AppError(422, 'Validation failed', 'VALIDATION_ERROR'));
      return;
    }
    try {
      const { query, limit, institution_id, program_id } = parsed.data;
      const result = await semanticSearch(query, limit, { institution_id, program_id });
      sendSuccess(res, result);
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ── GET /api/knowledge/search (convenience GET for simple queries) ─────────────

knowledgeRouter.get(
  '/search',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const query = String(req.query.q ?? '').trim();
    if (!query) {
      sendError(res, new AppError(422, 'Missing query parameter: q', 'VALIDATION_ERROR'));
      return;
    }
    const limit = Math.min(parseInt(String(req.query.limit ?? '5'), 10) || 5, 20);
    try {
      const result = await semanticSearch(query, limit, {
        institution_id: req.query.institution_id
          ? String(req.query.institution_id)
          : undefined,
        program_id: req.query.program_id
          ? String(req.query.program_id)
          : undefined,
      });
      sendSuccess(res, result);
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ── POST /api/knowledge/preview-chunks ────────────────────────────────────────

// Utility: show how a text would be chunked without ingesting it
const previewSchema = z.object({
  text: z.string().min(1).max(50000),
});

knowledgeRouter.post(
  '/preview-chunks',
  authenticate,
  requireRole('PROGRAM_ADMIN', 'SUPER_ADMIN', 'PLATFORM_OWNER'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = previewSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, new AppError(422, 'Validation failed', 'VALIDATION_ERROR'));
      return;
    }
    const chunks = chunkText(parsed.data.text);
    sendSuccess(res, {
      chunk_count: chunks.length,
      chunks: chunks.map((text, i) => ({ index: i, length: text.length, preview: text.slice(0, 200) })),
    });
  }
);
