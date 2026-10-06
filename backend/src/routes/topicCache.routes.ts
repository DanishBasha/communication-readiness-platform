/**
 * Topic Cache API Routes
 *
 * Provides endpoints for managing the persistent topic cache
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../shared/errors/AppError';
import { sendSuccess, sendError } from '../shared/helpers/response';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { topicCacheService } from '../services/topicCacheService';

export const topicCacheRouter = Router();

// GET /api/topic-cache - List all cached topics
topicCacheRouter.get(
  '/',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const topics = await topicCacheService.getAllCachedTopics();

      sendSuccess(res, {
        topics,
        count: topics.length,
      });
    } catch (err) {
      sendError(res, err);
    }
  }
);

// GET /api/topic-cache/:topic - Get cached questions for a topic
topicCacheRouter.get(
  '/:topic',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { topic } = req.params;
      const cache = await topicCacheService.getFromCache(topic);

      if (!cache) {
        sendSuccess(res, {
          exists: false,
          topic,
          items: [],
        });
        return;
      }

      sendSuccess(res, {
        exists: true,
        topic: cache.topic,
        items: cache.items,
        lastUpdated: cache.lastUpdated,
      });
    } catch (err) {
      sendError(res, err);
    }
  }
);

// GET /api/topic-cache/:topic/stats - Get cache statistics for a topic
topicCacheRouter.get(
  '/:topic/stats',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { topic } = req.params;
      const stats = await topicCacheService.getCacheStats(topic);

      sendSuccess(res, stats);
    } catch (err) {
      sendError(res, err);
    }
  }
);

// GET /api/topic-cache/:topic/random - Get a random question from cache
topicCacheRouter.get(
  '/:topic/random',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { topic } = req.params;
      const difficulty = req.query.difficulty as 'EASY' | 'MEDIUM' | 'ADVANCED' | undefined;

      const pair = await topicCacheService.getRandomPair(topic, difficulty);

      if (!pair) {
        throw new AppError(404, 'No cached questions found for this topic', 'NOT_FOUND');
      }

      sendSuccess(res, pair);
    } catch (err) {
      sendError(res, err);
    }
  }
);

// POST /api/topic-cache - Manually add a question to cache
topicCacheRouter.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'TRAINER'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const schema = z.object({
        topic: z.string().min(1),
        question: z.string().min(1),
        rubric: z.record(z.unknown()),
        difficulty: z.enum(['EASY', 'MEDIUM', 'ADVANCED']),
        ttlSeconds: z.number().positive().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR');
      }

      const { topic, question, rubric, difficulty, ttlSeconds } = parsed.data;

      await topicCacheService.addToCache(topic, question, rubric, difficulty, ttlSeconds);

      sendSuccess(res, {
        message: 'Question added to cache successfully',
        topic,
      }, 201);
    } catch (err) {
      sendError(res, err);
    }
  }
);

// DELETE /api/topic-cache/:topic - Clear cache for a specific topic
topicCacheRouter.delete(
  '/:topic',
  authenticate,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { topic } = req.params;
      await topicCacheService.clearTopicCache(topic);

      sendSuccess(res, {
        message: 'Topic cache cleared successfully',
        topic,
      });
    } catch (err) {
      sendError(res, err);
    }
  }
);

// DELETE /api/topic-cache - Clear all topic caches (admin only)
topicCacheRouter.delete(
  '/',
  authenticate,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await topicCacheService.clearAllCaches();

      sendSuccess(res, {
        message: 'All topic caches cleared successfully',
      });
    } catch (err) {
      sendError(res, err);
    }
  }
);

// PATCH /api/topic-cache/:topic/ttl - Update TTL for a topic cache
topicCacheRouter.patch(
  '/:topic/ttl',
  authenticate,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { topic } = req.params;
      const schema = z.object({
        ttlSeconds: z.number().positive(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR');
      }

      await topicCacheService.updateTTL(topic, parsed.data.ttlSeconds);

      sendSuccess(res, {
        message: 'TTL updated successfully',
        topic,
        ttlSeconds: parsed.data.ttlSeconds,
      });
    } catch (err) {
      sendError(res, err);
    }
  }
);
