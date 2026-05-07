/**
 * Permission Middleware
 * Checks if user has required permissions for modules and features
 */

/**
 * Check if user has permission for a specific module action
 * @param {string} module - Module name (e.g., 'projects', 'documents')
 * @param {string} action - Action type (e.g., 'view', 'edit', 'delete')
 */
export const checkPermission = (module, action = 'view') => {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    // Owner and Super Admin always have access
    if (user.role === 'ORG_OWNER' || user.role === 'SUPER_ADMIN') {
      return next();
    }
    
    // Check user permissions using the model method
    const hasPermission = user.hasModulePermission(module, action);
    
    if (!hasPermission) {
      return res.status(403).json({
        error: `You don't have permission to ${action} ${module}`
      });
    }
    
    next();
  };
};

/**
 * Check if user has access to a specific feature
 * @param {string} feature - Feature name (e.g., 'globalBot', 'aiChat')
 */
export const checkFeature = (feature) => {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    // Owner and Super Admin always have access
    if (user.role === 'ORG_OWNER' || user.role === 'SUPER_ADMIN') {
      return next();
    }
    
    // Check user feature permission using the model method
    const hasFeature = user.hasFeaturePermission(feature);
    
    if (!hasFeature) {
      return res.status(403).json({
        error: `You don't have access to ${feature} feature`
      });
    }
    
    next();
  };
};

/**
 * Check if user can manage permissions (Owner or Admin only)
 */
export const canManagePermissions = (req, res, next) => {
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }
  
  if (user.role !== 'ORG_OWNER' && user.role !== 'ORG_ADMIN' && user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Only owners and admins can manage permissions'
    });
  }
  
  next();
};

/**
 * Check if user can manage a specific user's permissions
 * Owners can manage everyone, Admins can manage non-admins
 */
export const canManageUserPermissions = async (req, res, next) => {
  const user = req.user;
  const targetUserId = req.params.userId;
  
  if (!user) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }
  
  // Owner can manage everyone
  if (user.role === 'ORG_OWNER' || user.role === 'SUPER_ADMIN') {
    return next();
  }
  
  // Admin can manage non-admin users
  if (user.role === 'ORG_ADMIN') {
    const User = (await import('../models/User.model.js')).default;
    const targetUser = await User.findById(targetUserId);
    
    if (!targetUser) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Admin cannot manage Owner or other Admins
    if (targetUser.role === 'ORG_OWNER' || targetUser.role === 'ORG_ADMIN' || targetUser.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Admins cannot manage owner or other admin permissions'
      });
    }
    
    return next();
  }
  
  return res.status(403).json({
    error: 'You do not have permission to manage user permissions'
  });
};
