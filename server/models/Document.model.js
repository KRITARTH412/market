import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['pdf', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'mp3', 'wav'],
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  cloudinaryUrl: {
    type: String,
    required: true
  },
  cloudinaryPublicId: {
    type: String,
    required: true
  },
  vectorized: {
    type: Boolean,
    default: false
  },
  vectorizationStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  vectorizationError: {
    type: String,
    default: null
  },
  pageCount: {
    type: Number,
    default: 0
  },
  chunkCount: {
    type: Number,
    default: 0
  },
  metadata: {
    transcription: String,
    extractedText: String,
    language: String,
    author: String
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String
  }],
  category: {
    type: String,
    enum: ['brochure', 'floor_plan', 'legal', 'marketing', 'contract', 'other'],
    default: 'other'
  },
  legalAnalysis: {
    analyzed: {
      type: Boolean,
      default: false
    },
    riskScore: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: null
    },
    risks: [{
      category: String,
      severity: String,
      description: String,
      clause: String
    }],
    notes: [{
      text: String,
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      addedAt: Date
    }]
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
documentSchema.index({ organizationId: 1, projectId: 1 });
documentSchema.index({ organizationId: 1, vectorized: 1 });
documentSchema.index({ organizationId: 1, category: 1 });

const Document = mongoose.model('Document', documentSchema);

export default Document;
