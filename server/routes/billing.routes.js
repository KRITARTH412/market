import express from 'express';
import { body } from 'express-validator';
import {
  getPlans,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  getInvoices,
  handleWebhook
} from '../controllers/billing.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Webhook endpoint (no auth required, verified by signature)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// All other routes require authentication
router.use(authenticate);

// Get available plans
router.get('/plans', getPlans);

// Create subscription
router.post(
  '/subscribe',
  authorize('billing'),
  [
    body('plan').isIn(['basic', 'pro', 'enterprise']).withMessage('Invalid plan')
  ],
  createSubscription
);

// Update subscription (upgrade/downgrade)
router.patch(
  '/subscription',
  authorize('billing'),
  [
    body('plan').isIn(['basic', 'pro', 'enterprise']).withMessage('Invalid plan')
  ],
  updateSubscription
);

// Cancel subscription
router.post('/subscription/cancel', authorize('billing'), cancelSubscription);

// Get invoices
router.get('/invoices', authorize('billing'), getInvoices);

export default router;
