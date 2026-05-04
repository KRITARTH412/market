import mongoose from 'mongoose';

const queryLogSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    default: null
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatSession',
    default: null
  },
  query: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  sources: [{
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    },
    fileName: String,
    relevanceScore: Number
  }],
  tokensUsed: {
    prompt: Number,
    completion: Number,
    total: Number
  },
  latencyMs: {
    type: Number,
    required: true
  },
  model: {
    type: String,
    default: 'gpt-4o'
  },
  source: {
    type: String,
    enum: ['internal', 'widget', 'api'],
    default: 'internal'
  },
  metadata: {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    userAgent: String,
    ipAddress: String
  }
}, {
  timestamps: true
});

// Indexes for analytics queries
queryLogSchema.index({ organizationId: 1, createdAt: -1 });
queryLogSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });
queryLogSchema.index({ organizationId: 1, 'metadata.projectId': 1 });

const QueryLog = mongoose.model('QueryLog', queryLogSchema);

export default QueryLog;
