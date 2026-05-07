import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { canManagePermissions, canManageUserPermissions } from '../middleware/permission.middleware.js';
import {
  getUserPermissions,
  updateUserPermissions,
  grantPermission,
  revokePermission,
  getDefaultPermissions,
  bulkUpdatePermissions,
  resetToDefaults
} from '../controllers/permission.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user permissions
router.get('/users/:userId', getUserPermissions);

// Update user permissions (requires owner/admin)
router.put('/users/:userId', canManageUserPermissions, updateUserPermissions);

// Grant specific permission (requires owner/admin)
router.post('/users/:userId/grant', canManageUserPermissions, grantPermission);

// Revoke specific permission (requires owner/admin)
router.post('/users/:userId/revoke', canManageUserPermissions, revokePermission);

// Reset user permissions to role defaults (requires owner/admin)
router.post('/users/:userId/reset', canManageUserPermissions, resetToDefaults);

// Get default permissions for a role
router.get('/roles/:role/defaults', getDefaultPermissions);

// Bulk update permissions (requires owner/admin)
router.post('/bulk-update', canManagePermissions, bulkUpdatePermissions);

export default router;
