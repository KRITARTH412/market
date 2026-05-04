import express from 'express';
import { body } from 'express-validator';
import {
  getOrganization,
  updateOrganization,
  getMembers,
  inviteMember,
  updateMemberRole,
  deactivateMember,
  getUsageStats
} from '../controllers/org.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { checkUserLimit } from '../middleware/usageCheck.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get organization details
router.get('/', getOrganization);

// Update organization settings
router.patch(
  '/',
  authorize('settings'),
  [
    body('name').optional().trim().notEmpty(),
    body('logoUrl').optional().isURL(),
    body('primaryColor').optional().matches(/^#[0-9A-F]{6}$/i)
  ],
  updateOrganization
);

// Get organization members
router.get('/members', authorize('settings'), getMembers);

// Invite new member
router.post(
  '/invite',
  authorize('invite'),
  checkUserLimit,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('role').isIn(['ORG_ADMIN', 'SALES_AGENT', 'LEAD_MANAGER', 'VIEWER']).withMessage('Invalid role')
  ],
  inviteMember
);

// Update member role
router.patch(
  '/members/:memberId/role',
  authorize('settings'),
  [
    body('role').isIn(['ORG_ADMIN', 'SALES_AGENT', 'LEAD_MANAGER', 'VIEWER']).withMessage('Invalid role')
  ],
  updateMemberRole
);

// Deactivate member
router.patch('/members/:memberId/deactivate', authorize('settings'), deactivateMember);

// Get usage statistics
router.get('/usage', getUsageStats);

export default router;
