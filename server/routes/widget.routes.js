import express from 'express';
import { body } from 'express-validator';
import {
  widgetChat,
  captureWidgetLead,
  getWidgetConfig
} from '../controllers/widget.controller.js';
import { authenticateApiKey } from '../middleware/auth.middleware.js';
import { widgetRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { checkQueryLimit } from '../middleware/usageCheck.middleware.js';

const router = express.Router();

// Widget routes use API key authentication
router.use(authenticateApiKey);
router.use(widgetRateLimiter);

// Get widget configuration
router.get('/config', getWidgetConfig);

// Capture lead from widget
router.post(
  '/lead',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('email').optional().isEmail()
  ],
  captureWidgetLead
);

// Widget chat endpoint
router.post(
  '/chat',
  checkQueryLimit,
  [
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('sessionId').optional(),
    body('leadId').optional().isMongoId()
  ],
  widgetChat
);

export default router;
