import { validationResult } from 'express-validator';
import { extractPropertyRequirements, generateEmbedding } from '../services/openai.service.js';
import { queryVectors } from '../services/vector.service.js';
import Project from '../models/Project.model.js';
import Document from '../models/Document.model.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const searchProperties = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { query } = req.body;

  // Extract requirements using AI
  const requirements = await extractPropertyRequirements(query);

  // Build MongoDB filter
  const projectFilter = {
    organizationId: req.organizationId,
    isDeleted: false
  };

  if (requirements.location) {
    projectFilter.$or = [
      { 'location.city': new RegExp(requirements.location, 'i') },
      { 'location.address': new RegExp(requirements.location, 'i') }
    ];
  }

  if (requirements.bhkType) {
    projectFilter['specifications.bhkTypes'] = requirements.bhkType;
  }

  if (requirements.minBudget || requirements.maxBudget) {
    projectFilter['specifications.priceRange.min'] = {};
    if (requirements.minBudget) {
      projectFilter['specifications.priceRange.max'] = { $gte: requirements.minBudget };
    }
    if (requirements.maxBudget) {
      projectFilter['specifications.priceRange.min'] = { $lte: requirements.maxBudget };
    }
  }

  // Search projects in MongoDB
  const projects = await Project.find(projectFilter).limit(10);

  // Also search in vector store for relevant documents
  const queryEmbedding = await generateEmbedding(query);
  const vectorResults = await queryVectors(req.organizationId, queryEmbedding, 5);

  // Enrich with document details
  const documentMatches = await Promise.all(
    vectorResults.map(async (result) => {
      const document = await Document.findById(result.documentId);
      return {
        documentId: result.documentId,
        fileName: document?.fileName,
        excerpt: result.text,
        relevanceScore: result.score,
        projectId: result.projectId
      };
    })
  );

  res.json({
    query,
    extractedRequirements: requirements,
    projects: projects.map(p => ({
      id: p._id,
      name: p.name,
      location: p.location,
      specifications: p.specifications,
      coverImage: p.coverImage,
      amenities: p.amenities,
      matchScore: 0.85 // Placeholder - implement proper scoring
    })),
    documentMatches
  });
});
