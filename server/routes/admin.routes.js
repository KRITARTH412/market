import express from 'express';
import {
  getAllOrganizations,
  getOrganizationDetails,
  impersonateOrganization,
  getPlatformStats,
  getAuditLogs,
  exportAuditLogs
} from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require SUPER_ADMIN role
router.use(authenticate);
router.use((req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
});

// Get all organizations
router.get('/organizations', getAllOrganizations);

// Get organization details
router.get('/organizations/:id', getOrganizationDetails);

// Impersonate organization (get access token)
router.post('/organizations/:id/impersonate', impersonateOrganization);

// Get platform-wide statistics
router.get('/stats', getPlatformStats);

// Get audit logs
router.get('/audit-logs', getAuditLogs);

// Export audit logs as CSV
router.get('/audit-logs/export', exportAuditLogs);

export default router;
