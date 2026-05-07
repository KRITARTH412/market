import mongoose from 'mongoose';

// Vector storage schema
const vectorSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  },
  vectorId: {
    type: String,
    required: true,
    unique: true
  },
  embedding: {
    type: [Number],
    required: true
  },
  fileName: String,
  text: String,
  pageNumber: {
    type: Number,
    default: 0
  },
  chunkIndex: {
    type: Number,
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Create indexes for efficient querying
vectorSchema.index({ organizationId: 1, documentId: 1 });
vectorSchema.index({ organizationId: 1, projectId: 1 });

const Vector = mongoose.model('Vector', vectorSchema);

// Cosine similarity function
const cosineSimilarity = (vecA, vecB) => {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
};

// Upsert vectors
export const upsertVectors = async (organizationId, vectors) => {
  try {
    const operations = vectors.map((vector, idx) => {
      const vectorId = vector.id || `${organizationId}-${Date.now()}-${idx}`;
      
      return {
        updateOne: {
          filter: { vectorId },
          update: {
            $set: {
              organizationId,
              documentId: vector.documentId,
              projectId: vector.projectId || null,
              vectorId,
              embedding: vector.embedding,
              fileName: vector.fileName,
              text: vector.text,
              pageNumber: vector.pageNumber || 0,
              chunkIndex: vector.chunkIndex || idx,
              metadata: vector.metadata || {}
            }
          },
          upsert: true
        }
      };
    });

    await Vector.bulkWrite(operations);

    return { success: true, count: vectors.length };
  } catch (error) {
    console.error('MongoDB vector upsert error:', error);
    throw new Error('Failed to store vectors');
  }
};

// Query vectors using cosine similarity with strict isolation
export const queryVectors = async (organizationId, queryEmbedding, topK = 5, filter = {}) => {
  try {
    // MANDATORY: Validate organizationId is present
    if (!organizationId) {
      throw new Error('organizationId filter is mandatory for vector search');
    }

    // Build query filter with mandatory organizationId
    const queryFilter = {
      organizationId,
      ...filter
    };

    // CRITICAL: If projectId is in filter, it must be enforced (Project Bot mode)
    if (filter.projectId !== undefined) {
      // Validate projectId is not null when specified
      if (filter.projectId === null) {
        throw new Error('projectId filter cannot be null in Project Bot mode');
      }
      queryFilter.projectId = filter.projectId;
    }

    // Get all vectors for the organization (with optional filters)
    const vectors = await Vector.find(queryFilter).lean();

    if (vectors.length === 0) {
      return [];
    }

    // Calculate similarity scores
    const results = vectors.map(vector => ({
      ...vector,
      score: cosineSimilarity(queryEmbedding, vector.embedding)
    }));

    // Sort by score (descending) and take top K
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, topK);

    // Format results
    return topResults.map(match => ({
      id: match.vectorId,
      score: match.score,
      documentId: match.documentId,
      projectId: match.projectId,
      fileName: match.fileName,
      text: match.text,
      pageNumber: match.pageNumber,
      chunkIndex: match.chunkIndex,
      metadata: match.metadata
    }));
  } catch (error) {
    console.error('MongoDB vector query error:', error);
    throw error;
  }
};

// Query vectors for Global Bot (all projects in organization)
export const queryVectorsGlobal = async (organizationId, queryEmbedding, topK = 5) => {
  try {
    // MANDATORY: Validate organizationId is present
    if (!organizationId) {
      throw new Error('organizationId filter is mandatory for vector search');
    }

    // Build query filter for ALL projects in the organization
    const queryFilter = {
      organizationId
    };

    console.log('🔎 Global vector query filter:', {
      organizationId: organizationId.toString()
    });

    // Get all vectors from the organization (all projects)
    const vectors = await Vector.find(queryFilter).lean();

    console.log('📦 Vectors found in database (global):', {
      count: vectors.length,
      sample: vectors.slice(0, 2).map(v => ({
        vectorId: v.vectorId,
        fileName: v.fileName,
        projectId: v.projectId?.toString(),
        organizationId: v.organizationId?.toString(),
        textPreview: v.text?.substring(0, 50)
      }))
    });

    if (vectors.length === 0) {
      console.log('⚠️ No vectors found for this organization.');
      return [];
    }

    // Calculate similarity scores
    const results = vectors.map(vector => ({
      ...vector,
      score: cosineSimilarity(queryEmbedding, vector.embedding)
    }));

    // Sort by score (descending) and take top K
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, topK);

    // Format results with project information
    return topResults.map(match => ({
      id: match.vectorId,
      score: match.score,
      documentId: match.documentId,
      projectId: match.projectId,
      fileName: match.fileName,
      text: match.text,
      pageNumber: match.pageNumber,
      chunkIndex: match.chunkIndex,
      metadata: match.metadata
    }));
  } catch (error) {
    console.error('MongoDB vector query error (global):', error);
    throw error;
  }
};

// Query vectors for Project Bot (single project with strict isolation)
export const queryVectorsProject = async (organizationId, projectId, queryEmbedding, topK = 5) => {
  try {
    // MANDATORY: Validate both organizationId and projectId
    if (!organizationId) {
      throw new Error('organizationId filter is mandatory for vector search');
    }
    if (!projectId) {
      throw new Error('projectId filter is mandatory for Project Bot search');
    }

    // Build query filter with STRICT project isolation
    const queryFilter = {
      organizationId,
      projectId
    };

    console.log('🔎 Vector query filter:', {
      organizationId: organizationId.toString(),
      projectId: projectId.toString()
    });

    // Get vectors ONLY from the specified project
    const vectors = await Vector.find(queryFilter).lean();

    console.log('📦 Vectors found in database:', {
      count: vectors.length,
      sample: vectors.slice(0, 2).map(v => ({
        vectorId: v.vectorId,
        fileName: v.fileName,
        projectId: v.projectId?.toString(),
        organizationId: v.organizationId?.toString(),
        textPreview: v.text?.substring(0, 50)
      }))
    });

    if (vectors.length === 0) {
      console.log('⚠️ No vectors found for this project. Check if documents were vectorized correctly.');
      return [];
    }

    // Calculate similarity scores
    const results = vectors.map(vector => ({
      ...vector,
      score: cosineSimilarity(queryEmbedding, vector.embedding)
    }));

    // Sort by score (descending) and take top K
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, topK);

    // Post-retrieval validation: Ensure all results match the project
    const validatedResults = topResults.filter(match => {
      if (match.projectId?.toString() !== projectId.toString()) {
        console.error('SECURITY ALERT: Cross-project leakage detected!', {
          expectedProjectId: projectId,
          actualProjectId: match.projectId,
          vectorId: match.vectorId
        });
        return false;
      }
      return true;
    });

    // Format results
    return validatedResults.map(match => ({
      id: match.vectorId,
      score: match.score,
      documentId: match.documentId,
      projectId: match.projectId,
      fileName: match.fileName,
      text: match.text,
      pageNumber: match.pageNumber,
      chunkIndex: match.chunkIndex,
      metadata: match.metadata
    }));
  } catch (error) {
    console.error('MongoDB vector query error (project):', error);
    throw error;
  }
};

// Delete vectors by document
export const deleteVectorsByDocument = async (organizationId, documentId) => {
  try {
    await Vector.deleteMany({
      organizationId,
      documentId
    });

    return { success: true };
  } catch (error) {
    console.error('MongoDB vector delete error:', error);
    throw new Error('Failed to delete vectors');
  }
};

// Delete all vectors for organization (use with caution)
export const deleteNamespace = async (organizationId) => {
  try {
    await Vector.deleteMany({ organizationId });

    return { success: true };
  } catch (error) {
    console.error('MongoDB namespace delete error:', error);
    throw new Error('Failed to delete namespace');
  }
};

// Get namespace stats
export const getNamespaceStats = async (organizationId) => {
  try {
    const vectorCount = await Vector.countDocuments({ organizationId });
    
    // Get dimension from first vector
    const sampleVector = await Vector.findOne({ organizationId }).lean();
    const dimension = sampleVector?.embedding?.length || 0;

    return {
      vectorCount,
      dimension
    };
  } catch (error) {
    console.error('MongoDB stats error:', error);
    return { vectorCount: 0, dimension: 0 };
  }
};

export default Vector;
