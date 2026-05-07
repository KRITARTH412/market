import User from '../models/User.model.js';

/**
 * Get user permissions
 */
export const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('Getting permissions for userId:', userId);
    console.log('Request organizationId:', req.organizationId);
    
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    console.log('Found user:', {
      id: user._id,
      name: user.name,
      organizationId: user.organizationId,
      role: user.role
    });
    
    // Check if user is in same organization
    if (!user.organizationId) {
      console.error('User has no organizationId:', userId);
      return res.status(500).json({
        error: 'User data is incomplete'
      });
    }
    
    if (user.organizationId.toString() !== req.organizationId.toString()) {
      console.log('Organization mismatch:', {
        userOrg: user.organizationId.toString(),
        reqOrg: req.organizationId.toString()
      });
      return res.status(403).json({
        error: 'Cannot access user from different organization'
      });
    }
    
    // Convert Map to Object, handling undefined/null cases
    let modulePermissions = {};
    let featurePermissions = {};
    
    if (user.modulePermissions && user.modulePermissions instanceof Map) {
      modulePermissions = Object.fromEntries(user.modulePermissions);
    } else if (user.modulePermissions && typeof user.modulePermissions === 'object') {
      modulePermissions = user.modulePermissions;
    }
    
    if (user.featurePermissions && user.featurePermissions instanceof Map) {
      featurePermissions = Object.fromEntries(user.featurePermissions);
    } else if (user.featurePermissions && typeof user.featurePermissions === 'object') {
      featurePermissions = user.featurePermissions;
    }
    
    // If no permissions set, get defaults for role
    if (Object.keys(modulePermissions).length === 0 && Object.keys(featurePermissions).length === 0) {
      console.log('No permissions set, getting defaults for role:', user.role);
      const defaults = User.getDefaultPermissions(user.role);
      if (defaults) {
        modulePermissions = defaults.modules || {};
        featurePermissions = defaults.features || {};
      }
    }
    
    console.log('Returning permissions:', {
      moduleCount: Object.keys(modulePermissions).length,
      featureCount: Object.keys(featurePermissions).length
    });
    
    res.json({
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      modulePermissions,
      featurePermissions
    });
  } catch (error) {
    console.error('Error getting user permissions:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to get user permissions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user permissions
 */
export const updateUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { modulePermissions, featurePermissions } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Check if user is in same organization
    if (user.organizationId.toString() !== req.organizationId.toString()) {
      return res.status(403).json({
        error: 'Cannot update user from different organization'
      });
    }
    
    // Cannot modify Owner or Super Admin permissions
    if (user.role === 'ORG_OWNER' || user.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Cannot modify owner or super admin permissions'
      });
    }
    
    // Update module permissions
    if (modulePermissions) {
      user.modulePermissions = new Map(Object.entries(modulePermissions));
    }
    
    // Update feature permissions
    if (featurePermissions) {
      user.featurePermissions = new Map(Object.entries(featurePermissions));
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Permissions updated successfully',
      modulePermissions: Object.fromEntries(user.modulePermissions || new Map()),
      featurePermissions: Object.fromEntries(user.featurePermissions || new Map())
    });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    res.status(500).json({
      error: 'Failed to update user permissions'
    });
  }
};

/**
 * Grant specific permission to user
 */
export const grantPermission = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, module, action, feature } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Check if user is in same organization
    if (user.organizationId.toString() !== req.organizationId.toString()) {
      return res.status(403).json({
        error: 'Cannot update user from different organization'
      });
    }
    
    if (type === 'module') {
      if (!module || !action) {
        return res.status(400).json({
          error: 'Module and action are required'
        });
      }
      
      const modulePerms = user.modulePermissions?.get(module) || { view: false, edit: false, delete: false };
      modulePerms[action] = true;
      user.setModulePermission(module, modulePerms);
    } else if (type === 'feature') {
      if (!feature) {
        return res.status(400).json({
          error: 'Feature is required'
        });
      }
      
      user.setFeaturePermission(feature, true);
    } else {
      return res.status(400).json({
        error: 'Invalid permission type. Must be "module" or "feature"'
      });
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Permission granted successfully'
    });
  } catch (error) {
    console.error('Error granting permission:', error);
    res.status(500).json({
      error: 'Failed to grant permission'
    });
  }
};

/**
 * Revoke specific permission from user
 */
export const revokePermission = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, module, action, feature } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Check if user is in same organization
    if (user.organizationId.toString() !== req.organizationId.toString()) {
      return res.status(403).json({
        error: 'Cannot update user from different organization'
      });
    }
    
    if (type === 'module') {
      if (!module || !action) {
        return res.status(400).json({
          error: 'Module and action are required'
        });
      }
      
      const modulePerms = user.modulePermissions?.get(module) || { view: false, edit: false, delete: false };
      modulePerms[action] = false;
      user.setModulePermission(module, modulePerms);
    } else if (type === 'feature') {
      if (!feature) {
        return res.status(400).json({
          error: 'Feature is required'
        });
      }
      
      user.setFeaturePermission(feature, false);
    } else {
      return res.status(400).json({
        error: 'Invalid permission type. Must be "module" or "feature"'
      });
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Permission revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking permission:', error);
    res.status(500).json({
      error: 'Failed to revoke permission'
    });
  }
};

/**
 * Get default permissions for a role
 */
export const getDefaultPermissions = async (req, res) => {
  try {
    const { role } = req.params;
    
    const validRoles = ['ORG_ADMIN', 'SALES_AGENT', 'LEAD_MANAGER', 'VIEWER'];
    
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be one of: ' + validRoles.join(', ')
      });
    }
    
    const defaults = User.getDefaultPermissions(role);
    
    res.json({
      role,
      permissions: defaults
    });
  } catch (error) {
    console.error('Error getting default permissions:', error);
    res.status(500).json({
      error: 'Failed to get default permissions'
    });
  }
};

/**
 * Bulk update permissions for multiple users
 */
export const bulkUpdatePermissions = async (req, res) => {
  try {
    const { userIds, modulePermissions, featurePermissions } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        error: 'userIds array is required'
      });
    }
    
    const users = await User.find({
      _id: { $in: userIds },
      organizationId: req.organizationId
    });
    
    if (users.length === 0) {
      return res.status(404).json({
        error: 'No users found'
      });
    }
    
    // Update each user
    const updatePromises = users.map(async (user) => {
      // Skip Owner and Super Admin
      if (user.role === 'ORG_OWNER' || user.role === 'SUPER_ADMIN') {
        return null;
      }
      
      if (modulePermissions) {
        user.modulePermissions = new Map(Object.entries(modulePermissions));
      }
      
      if (featurePermissions) {
        user.featurePermissions = new Map(Object.entries(featurePermissions));
      }
      
      return user.save();
    });
    
    await Promise.all(updatePromises);
    
    res.json({
      success: true,
      message: `Permissions updated for ${users.length} users`,
      updatedCount: users.length
    });
  } catch (error) {
    console.error('Error bulk updating permissions:', error);
    res.status(500).json({
      error: 'Failed to bulk update permissions'
    });
  }
};

/**
 * Reset user permissions to role defaults
 */
export const resetToDefaults = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Check if user is in same organization
    if (user.organizationId.toString() !== req.organizationId.toString()) {
      return res.status(403).json({
        error: 'Cannot update user from different organization'
      });
    }
    
    // Cannot reset Owner or Super Admin
    if (user.role === 'ORG_OWNER' || user.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Cannot reset owner or super admin permissions'
      });
    }
    
    // Get default permissions for role
    const defaults = User.getDefaultPermissions(user.role);
    
    // Apply defaults
    user.modulePermissions = new Map(Object.entries(defaults.modules));
    user.featurePermissions = new Map(Object.entries(defaults.features));
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Permissions reset to role defaults',
      modulePermissions: Object.fromEntries(user.modulePermissions),
      featurePermissions: Object.fromEntries(user.featurePermissions)
    });
  } catch (error) {
    console.error('Error resetting permissions:', error);
    res.status(500).json({
      error: 'Failed to reset permissions'
    });
  }
};
