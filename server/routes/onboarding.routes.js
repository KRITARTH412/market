import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getOnboardingStatus,
  updateOnboardingStep,
  skipOnboarding,
  restartOnboarding,
  getTourSteps,
  completeTour
} from '../controllers/onboarding.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get onboarding status
router.get('/status', getOnboardingStatus);

// Update onboarding step
router.post('/step', updateOnboardingStep);

// Skip onboarding
router.post('/skip', skipOnboarding);

// Restart onboarding
router.post('/restart', restartOnboarding);

// Get tour steps
router.get('/tour', getTourSteps);

// Complete tour
router.post('/tour/complete', completeTour);

export default router;
