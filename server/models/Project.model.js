import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
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
  description: {
    type: String,
    default: ''
  },
  location: {
    address: String,
    city: String,
    state: String,
    country: String,
    pincode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  status: {
    type: String,
    enum: ['planning', 'under_construction', 'ready_to_move', 'completed'],
    default: 'planning'
  },
  coverImage: {
    type: String,
    default: null
  },
  images: [{
    url: String,
    caption: String
  }],
  amenities: [{
    type: String
  }],
  specifications: {
    totalUnits: Number,
    availableUnits: Number,
    bhkTypes: [String],
    priceRange: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'INR'
      }
    },
    carpetArea: {
      min: Number,
      max: Number,
      unit: {
        type: String,
        default: 'sqft'
      }
    },
    possessionDate: Date
  },
  assignedAgents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
projectSchema.index({ organizationId: 1, status: 1 });
projectSchema.index({ organizationId: 1, 'location.city': 1 });
projectSchema.index({ organizationId: 1, assignedAgents: 1 });

const Project = mongoose.model('Project', projectSchema);

export default Project;
