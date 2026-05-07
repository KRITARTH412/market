import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema({
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
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  chatMode: {
    type: String,
    enum: ['global', 'project'],
    required: true
  },
  source: {
    type: String,
    enum: ['internal', 'widget'],
    default: 'internal'
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    sources: [{
      documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
      },
      fileName: String,
      pageNumber: Number,
      relevanceScore: Number,
      excerpt: String
    }],
    timestamp: {
      type: Date,
      default: Date.now
    },
    tokenCount: {
      type: Number,
      default: 0
    }
  }],
  totalTokens: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    widgetConfig: mongoose.Schema.Types.Mixed
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
chatSessionSchema.index({ organizationId: 1, userId: 1 });
chatSessionSchema.index({ organizationId: 1, leadId: 1 });
chatSessionSchema.index({ organizationId: 1, projectId: 1 });
chatSessionSchema.index({ organizationId: 1, source: 1 });
chatSessionSchema.index({ organizationId: 1, userId: 1, projectId: 1 });
chatSessionSchema.index({ organizationId: 1, userId: 1, chatMode: 1 });

// Method to add message
chatSessionSchema.methods.addMessage = function(role, content, sources = [], tokenCount = 0) {
  this.messages.push({
    role,
    content,
    sources,
    timestamp: new Date(),
    tokenCount
  });
  this.totalTokens += tokenCount;
};

// Method to get context window
chatSessionSchema.methods.getContextWindow = function(maxTokens = 4000) {
  let tokens = 0;
  const contextMessages = [];
  
  // Get messages in reverse order
  for (let i = this.messages.length - 1; i >= 0; i--) {
    const message = this.messages[i];
    if (tokens + message.tokenCount > maxTokens) {
      break;
    }
    contextMessages.unshift(message);
    tokens += message.tokenCount;
  }
  
  return contextMessages;
};

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

export default ChatSession;
