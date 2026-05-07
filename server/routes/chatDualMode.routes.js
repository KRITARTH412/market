import express from 'express';
import {
  createChatSession,
  sendMessage,
  getChatSessions,
  getChatSession,
  deleteChatSession,
  grantGlobalBotAccess,
  revokeGlobalBotAccess
} from '../controllers/chatDualMode.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Chat session management
router.post('/sessions', createChatSession);
router.get('/sessions', getChatSessions);
router.get('/sessions/:sessionId', getChatSession);
router.delete('/sessions/:sessionId', deleteChatSession);

// Send message
router.post('/sessions/:sessionId/messages', sendMessage);

// Permission management (admin only)
router.post('/permissions/global-bot/:userId/grant', grantGlobalBotAccess);
router.post('/permissions/global-bot/:userId/revoke', revokeGlobalBotAccess);

export default router;
