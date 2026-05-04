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
  return userPermissions.includes('all') || userPermissions.includes(permission);
};

// Compound index for organization queries
userSchema.index({ organizationId: 1, email: 1 });
userSchema.index({ organizationId: 1, role: 1 });

const User = mongoose.model('User', userSchema);

export default User;
