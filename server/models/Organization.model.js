import mongoose from 'mongoose';
import crypto from 'crypto';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  plan: {
    type: String,
    enum: ['basic', 'pro', 'enterprise'],
    default: 'basic'
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  logoUrl: {
    type: String,
    default: null
  },
  primaryColor: {
    type: String,
    default: '#3B82F6'
  },
  customDomain: {
    type: String,
    default: null
  },
  apiKey: {
    type: String,
    required: false,
    unique: true
  },
  apiKeyHash: {
    type: String,
    required: false
  },
  limits: {
    maxUsers: {
      type: Number,
      default: 2
    },
    maxDocuments: {
      type: Number,
      default: 20
    },
    maxProjects: {
      type: Number,
      default: 5
    },
    monthlyQueryLimit: {
      type: Number,
      default: 500
    },
    maxStorageBytes: {
      type: Number,
      default: 104857600 // 100MB
    }
  },
  usage: {
    userCount: {
      type: Number,
      default: 1
    },
    documentCount: {
      type: Number,
      default: 0
    },
    projectCount: {
      type: Number,
      default: 0
    },
    monthlyQueryCount: {
      type: Number,
      default: 0
    },
    storageBytes: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },
  subscription: {
    status: {
      type: String,
      enum: ['active', 'trial', 'expired', 'cancelled'],
      default: 'trial'
    },
    trialEndsAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
    },
    currentPeriodEnd: {
      type: Date,
      default: null
    },
    razorpaySubscriptionId: {
      type: String,
      default: null
    }
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Generate API key before saving
organizationSchema.pre('save', function(next) {
  if (!this.apiKey) {
    const apiKey = `pk_${crypto.randomBytes(32).toString('hex')}`;
    this.apiKey = apiKey;
    this.apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  }
  next();
});

// Method to verify API key
organizationSchema.methods.verifyApiKey = function(apiKey) {
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
  return hash === this.apiKeyHash;
};

// Method to check if usage limit is exceeded
organizationSchema.methods.canUploadDocument = function() {
  return this.usage.documentCount < this.limits.maxDocuments;
};

organizationSchema.methods.canAddUser = function() {
  return this.usage.userCount < this.limits.maxUsers;
};

organizationSchema.methods.canAddProject = function() {
  return this.usage.projectCount < this.limits.maxProjects;
};

organizationSchema.methods.canMakeQuery = function() {
  return this.usage.monthlyQueryCount < this.limits.monthlyQueryLimit;
};

organizationSchema.methods.canUploadFile = function(fileSize) {
  return (this.usage.storageBytes + fileSize) <= this.limits.maxStorageBytes;
};

// Method to increment usage
organizationSchema.methods.incrementUsage = async function(type, value = 1) {
  this.usage[type] += value;
  await this.save();
};

// Method to reset monthly usage
organizationSchema.methods.resetMonthlyUsage = async function() {
  this.usage.monthlyQueryCount = 0;
  this.usage.lastResetDate = new Date();
  await this.save();
};

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;
