import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'auth.login',
      'auth.logout',
      'auth.register',
      'auth.token_refresh',
      'auth.password_reset',
      'user.invite',
      'user.role_change',
      'user.deactivate',
      'document.upload',
      'document.delete',
      'project.create',
      'project.update',
      'project.delete',
      'lead.create',
      'lead.update',
      'lead.status_change',
      'lead.assign',
      'subscription.change',
      'subscription.cancel',
      'org.settings_update',
      'org.delete'
    ]
  },
  resourceType: {
    type: String,
    enum: ['user', 'organization', 'document', 'project', 'lead', 'subscription', 'chat'],
    default: null
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['success', 'failure'],
    default: 'success'
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });

// TTL index to auto-delete logs older than 90 days
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
