import mongoose from 'mongoose';

const followUpSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
    index: true
  },
  sequence: [{
    step: Number,
    channel: {
      type: String,
      enum: ['email', 'whatsapp', 'sms'],
      required: true
    },
    delayDays: {
      type: Number,
      required: true
    },
    template: {
      type: String,
      required: true
    },
    subject: String,
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped'],
      default: 'pending'
    },
    scheduledAt: Date,
    sentAt: Date,
    error: String
  }],
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active'
  },
  currentStep: {
    type: Number,
    default: 0
  },
  nextRunAt: {
    type: Date,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pausedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  pausedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
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
followUpSchema.index({ organizationId: 1, status: 1, nextRunAt: 1 });
followUpSchema.index({ organizationId: 1, leadId: 1 });

// Method to get next step
followUpSchema.methods.getNextStep = function() {
  if (this.currentStep >= this.sequence.length) {
    return null;
  }
  return this.sequence[this.currentStep];
};

// Method to mark step as sent
followUpSchema.methods.markStepSent = async function(success = true, error = null) {
  const step = this.sequence[this.currentStep];
  if (step) {
    step.status = success ? 'sent' : 'failed';
    step.sentAt = new Date();
    if (error) step.error = error;
    
    this.currentStep++;
    
    // Calculate next run time
    if (this.currentStep < this.sequence.length) {
      const nextStep = this.sequence[this.currentStep];
      this.nextRunAt = new Date(Date.now() + nextStep.delayDays * 24 * 60 * 60 * 1000);
    } else {
      this.status = 'completed';
      this.completedAt = new Date();
    }
    
    await this.save();
  }
};

const FollowUp = mongoose.model('FollowUp', followUpSchema);

export default FollowUp;
