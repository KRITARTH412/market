import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
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
    trim: true,
    lowercase: true,
    default: null
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    type: String,
    enum: ['chatbot', 'manual', 'whatsapp', 'import', 'website'],
    default: 'manual'
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'site_visit', 'negotiating', 'closed_won', 'closed_lost'],
    default: 'new'
  },
  budget: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'INR'
    }
  },
  preferredLocation: {
    type: String,
    default: null
  },
  bhkType: {
    type: String,
    default: null
  },
  requirements: {
    type: String,
    default: ''
  },
  assignedAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  projectsInterested: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  scoreFactors: {
    budgetMatch: Number,
    engagementLevel: Number,
    responseTime: Number,
    recency: Number
  },
  notes: [{
    text: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  activities: [{
    type: {
      type: String,
      enum: ['call', 'email', 'meeting', 'site_visit', 'whatsapp', 'status_change', 'note_added']
    },
    description: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  queryHistory: [{
    query: String,
    answer: String,
    timestamp: Date
  }],
  lastContactedAt: {
    type: Date,
    default: null
  },
  outcomeDate: {
    type: Date,
    default: null
  },
  outcomeReason: {
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

// Indexes
leadSchema.index({ organizationId: 1, status: 1 });
leadSchema.index({ organizationId: 1, score: -1 });
leadSchema.index({ organizationId: 1, assignedAgentId: 1 });
leadSchema.index({ organizationId: 1, source: 1 });

// Method to calculate lead score
leadSchema.methods.calculateScore = async function() {
  let score = 0;
  const factors = {
    budgetMatch: 0,
    engagementLevel: 0,
    responseTime: 0,
    recency: 0
  };

  // Budget match (0-30 points)
  if (this.budget && this.budget.min && this.budget.max) {
    factors.budgetMatch = 30;
  } else if (this.budget && (this.budget.min || this.budget.max)) {
    factors.budgetMatch = 15;
  }

  // Engagement level (0-30 points)
  const queryCount = this.queryHistory.length;
  if (queryCount > 10) factors.engagementLevel = 30;
  else if (queryCount > 5) factors.engagementLevel = 20;
  else if (queryCount > 0) factors.engagementLevel = 10;

  // Response time (0-20 points)
  if (this.lastContactedAt) {
    const daysSinceContact = (Date.now() - this.lastContactedAt) / (1000 * 60 * 60 * 24);
    if (daysSinceContact < 1) factors.responseTime = 20;
    else if (daysSinceContact < 3) factors.responseTime = 15;
    else if (daysSinceContact < 7) factors.responseTime = 10;
    else if (daysSinceContact < 14) factors.responseTime = 5;
  }

  // Recency (0-20 points)
  const daysSinceCreation = (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24);
  if (daysSinceCreation < 7) factors.recency = 20;
  else if (daysSinceCreation < 14) factors.recency = 15;
  else if (daysSinceCreation < 30) factors.recency = 10;
  else if (daysSinceCreation < 60) factors.recency = 5;

  score = factors.budgetMatch + factors.engagementLevel + factors.responseTime + factors.recency;

  this.score = Math.min(100, Math.max(0, score));
  this.scoreFactors = factors;
  
  return this.score;
};

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
