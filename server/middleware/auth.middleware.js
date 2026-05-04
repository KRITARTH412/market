import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import Organization from '../models/Organization.model.js';

// Verify JWT token
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive || user.isDeleted) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    req.userId = user._id;
    req.organizationId = user.organizationId;
    req.userRole = user.role;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Verify API key for widget
export const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const organization = await Organization.findOne({ apiKey, isDeleted: false });
    
    if (!organization) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Check subscription status
    if (organization.subscription.status === 'expired' || organization.subscription.status === 'cancelled') {
      return res.status(402).json({ error: 'Subscription expired or cancelled' });
    }

    req.organizationId = organization._id;
    req.organization = organization;
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Check if user has required permission
export const authorize = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // SUPER_ADMIN has all permissions
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const hasPermission = permissions.some(permission => 
      req.user.hasPermission(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permissions,
        current: req.user.role
      });
    }

    next();
  };
};

// Check if user belongs to organization
export const checkOrganizationAccess = async (req, res, next) => {
  try {
    const orgIdFromParams = req.params.organizationId || req.body.organizationId;
    
    if (orgIdFromParams && orgIdFromParams !== req.organizationId.toString()) {
      // SUPER_ADMIN can access any organization
      if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Access denied to this organization' });
      }
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Authorization check failed' });
  }
};

// Ensure organizationId filter in queries
export const enforceOrganizationFilter = (req, res, next) => {
  // Add organizationId to query params if not SUPER_ADMIN
  if (req.user && req.user.role !== 'SUPER_ADMIN') {
    req.organizationFilter = { organizationId: req.organizationId };
  } else {
    req.organizationFilter = {};
  }
  
  next();
};
