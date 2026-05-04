import AuditLog from '../models/AuditLog.model.js';

export const createAuditLog = async (action, req, details = {}, resourceType = null, resourceId = null, status = 'success', errorMessage = null) => {
  try {
    await AuditLog.create({
      organizationId: req.organizationId || null,
      userId: req.userId || null,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status,
      errorMessage
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error - audit logging should not break the main flow
  }
};

// Middleware to automatically log certain actions
export const auditLogger = (action, resourceType = null) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    
    // Override send function
    res.send = function(data) {
      // Log after response is sent
      const status = res.statusCode < 400 ? 'success' : 'failure';
      const errorMessage = res.statusCode >= 400 ? data : null;
      
      createAuditLog(
        action,
        req,
        {
          method: req.method,
          path: req.path,
          body: req.body,
          params: req.params,
          query: req.query
        },
        resourceType,
        req.params.id || req.body._id || null,
        status,
        errorMessage
      );
      
      // Call original send
      originalSend.call(this, data);
    };
    
    next();
  };
};
