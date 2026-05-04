import express from 'express';
import { body } from 'express-validator';
import {
  getFollowUps,
  createFollowUp,
  getFollowUp,
  pauseFollowUp,
  resumeFollowUp,
  cancelFollowUp
} from '../controllers/followup.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all follow-ups
router.get('/', authorize('leads'), getFollowUps);

// Create follow-up sequence
router.post(
  '/',
  authorize('leads'),
  [
    body('leadId').isMongoId().withMessage('Valid lead ID is required'),
    body('sequence').isArray().withMessage('Sequence must be an array'),
    body('sequence.*.channel').isIn(['email', 'whatsapp', 'sms']),
    body('sequence.*.delayDays').isInt({ min: 0 }),
    body('sequence.*.template').trim().notEmpty()
  ],
  createFollowUp
);

// Get single follow-up
router.get('/:id', authorize('leads'), getFollowUp);

// Pause follow-up
router.post('/:id/pause', authorize('leads'), pauseFollowUp);

// Resume follow-up
router.post('/:id/resume', authorize('leads'), resumeFollowUp);

// Cancel follow-up
router.post('/:id/cancel', authorize('leads'), cancelFollowUp);

export default router;
