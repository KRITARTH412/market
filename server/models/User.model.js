import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'ORG_OWNER', 'ORG_ADMIN', 'SALES_AGENT', 'LEAD_MANAGER', 'VIEWER'],
    default: 'SALES_AGENT'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  refreshToken: {
    type: String,
    default: null
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  permissions: {
    type: [String],
    default: []
  },
  modulePermissions: {
    type: Map,
    of: {
      view: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    default: () => new Map()
  },
  featurePermissions: {
    type: Map,
    of: Boolean,
    default: () => new Map()
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to check if user has permission
userSchema.methods.hasPermission = function(permission) {
  const permissions = {
    SUPER_ADMIN: ['all'],
    ORG_OWNER: ['billing', 'invite', 'upload', 'chat', 'leads', 'analytics', 'settings'],
    ORG_ADMIN: ['invite', 'upload', 'chat', 'leads', 'analytics', 'settings'],
    SALES_AGENT: ['upload', 'chat', 'view_assigned_leads'],
    LEAD_MANAGER: ['chat', 'leads', 'analytics'],
    VIEWER: ['analytics']
  };

  const userPermissions = permissions[this.role] || [];
  
  // Check explicit permissions array first
  if (this.permissions && this.permissions.includes(permission)) {
    return true;
  }
  
  // Check role-based permissions
  return userPermissions.includes('all') || userPermissions.includes(permission);
};

// Method to check if user has global bot access
userSchema.methods.hasGlobalBotAccess = function() {
  // SUPER_ADMIN, ORG_OWNER, and ORG_ADMIN always have access
  if (this.role === 'SUPER_ADMIN' || this.role === 'ORG_OWNER' || this.role === 'ORG_ADMIN') {
    return true;
  }
  
  // Check explicit permission for other roles
  return this.permissions && this.permissions.includes('GLOBAL_BOT_ACCESS');
};

// Method to check module permission
userSchema.methods.hasModulePermission = function(module, action = 'view') {
  // Owner and Super Admin have all permissions
  if (this.role === 'SUPER_ADMIN' || this.role === 'ORG_OWNER') {
    return true;
  }
  
  // Check module permissions
  const modulePerms = this.modulePermissions?.get(module);
  return modulePerms?.[action] || false;
};

// Method to check feature permission
userSchema.methods.hasFeaturePermission = function(feature) {
  // Owner and Super Admin have all features
  if (this.role === 'SUPER_ADMIN' || this.role === 'ORG_OWNER') {
    return true;
  }
  
  return this.featurePermissions?.get(feature) || false;
};

// Method to set module permission
userSchema.methods.setModulePermission = function(module, permissions) {
  if (!this.modulePermissions) {
    this.modulePermissions = new Map();
  }
  this.modulePermissions.set(module, permissions);
};

// Method to set feature permission
userSchema.methods.setFeaturePermission = function(feature, enabled) {
  if (!this.featurePermissions) {
    this.featurePermissions = new Map();
  }
  this.featurePermissions.set(feature, enabled);
};

// Method to get default permissions for role
userSchema.statics.getDefaultPermissions = function(role) {
  const defaults = {
    ORG_ADMIN: {
      modules: {
        dashboard: { view: true, edit: true, delete: false },
        projects: { view: true, edit: true, delete: true },
        documents: { view: true, edit: true, delete: true },
        chat: { view: true, edit: true, delete: false },
        leads: { view: true, edit: true, delete: true },
        analytics: { view: true, edit: false, delete: false },
        team: { view: true, edit: true, delete: false },
        settings: { view: true, edit: true, delete: false },
        billing: { view: false, edit: false, delete: false }
      },
      features: {
        globalBot: true,
        aiChat: true,
        documentUpload: true,
        leadManagement: true,
        analytics: true,
        reporting: true,
        apiAccess: false
      }
    },
    SALES_AGENT: {
      modules: {
        dashboard: { view: true, edit: false, delete: false },
        projects: { view: true, edit: false, delete: false },
        documents: { view: true, edit: true, delete: false },
        chat: { view: true, edit: true, delete: false },
        leads: { view: true, edit: true, delete: false },
        analytics: { view: false, edit: false, delete: false },
        team: { view: false, edit: false, delete: false },
        settings: { view: false, edit: false, delete: false },
        billing: { view: false, edit: false, delete: false }
      },
      features: {
        globalBot: false,
        aiChat: true,
        documentUpload: true,
        leadManagement: true,
        analytics: false,
        reporting: false,
        apiAccess: false
      }
    },
    LEAD_MANAGER: {
      modules: {
        dashboard: { view: true, edit: false, delete: false },
        projects: { view: true, edit: false, delete: false },
        documents: { view: true, edit: false, delete: false },
        chat: { view: true, edit: true, delete: false },
        leads: { view: true, edit: true, delete: true },
        analytics: { view: true, edit: false, delete: false },
        team: { view: false, edit: false, delete: false },
        settings: { view: false, edit: false, delete: false },
        billing: { view: false, edit: false, delete: false }
      },
      features: {
        globalBot: false,
        aiChat: true,
        documentUpload: false,
        leadManagement: true,
        analytics: true,
        reporting: false,
        apiAccess: false
      }
    },
    VIEWER: {
      modules: {
        dashboard: { view: true, edit: false, delete: false },
        projects: { view: true, edit: false, delete: false },
        documents: { view: true, edit: false, delete: false },
        chat: { view: false, edit: false, delete: false },
        leads: { view: true, edit: false, delete: false },
        analytics: { view: true, edit: false, delete: false },
        team: { view: false, edit: false, delete: false },
        settings: { view: false, edit: false, delete: false },
        billing: { view: false, edit: false, delete: false }
      },
      features: {
        globalBot: false,
        aiChat: false,
        documentUpload: false,
        leadManagement: false,
        analytics: true,
        reporting: false,
        apiAccess: false
      }
    }
  };
  
  return defaults[role] || defaults.VIEWER;
};

// Method to grant permission
userSchema.methods.grantPermission = function(permission) {
  if (!this.permissions) {
    this.permissions = [];
  }
  if (!this.permissions.includes(permission)) {
    this.permissions.push(permission);
  }
};

// Method to revoke permission
userSchema.methods.revokePermission = function(permission) {
  if (this.permissions) {
    this.permissions = this.permissions.filter(p => p !== permission);
  }
};

// Compound index for organization queries
userSchema.index({ organizationId: 1, email: 1 });
userSchema.index({ organizationId: 1, role: 1 });

const User = mongoose.model('User', userSchema);

export default User;
