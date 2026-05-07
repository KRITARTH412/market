import express from 'express';
import {
  getDashboardStats,
  getOverview,
  getLeadAnalytics,
  getQueryAnalytics,
  getAgentPerformance,
  getDocumentUsage
} from '../controllers/analytics.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication and analytics permission
router.use(authenticate);
router.use(authorize('analytics'));

// Get overview stats (alias for dashboard)
router.get('/overview', getOverview);

// Get dashboard overview stats
router.get('/dashboard', getDashboardStats);

// Get lead analytics
router.get('/leads', getLeadAnalytics);

// Get query analytics
router.get('/queries', getQueryAnalytics);

// Get agent performance
router.get('/agents', getAgentPerformance);

// Get document usage
router.get('/documents', getDocumentUsage);

export default router;
