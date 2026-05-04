import express from 'express';
import { body } from 'express-validator';
import {
  sendMessage,
  getSessions,
  getSession,
  createSession,
  deleteSession
} from '../controllers/chat.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { checkQueryLimit } from '../middleware/usageCheck.middleware.js';
import { chatRateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Send message (streaming)
router.post(
  '/message',
  authorize('chat'),
  chatRateLimiter,
  checkQueryLimit,
  [
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('sessionId').optional().isMongoId(),
    body('projectId').optional().isMongoId()
  ],
  sendMessage
);

// Get all sessions
router.get('/sessions', getSessions);

// Create new session
router.post(
  '/sessions',
  authorize('chat'),
  [
    body('projectId').optional().isMongoId()
  ],
  createSession
);

// Get single session
router.get('/sessions/:id', getSession);

// Delete session
router.delete('/sessions/:id', deleteSession);

export default router;
