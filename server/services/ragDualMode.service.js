import { generateEmbedding, generateStreamingChatCompletion, countTokens } from './openai.service.js';
import { queryVectorsGlobal, queryVectorsProject } from './vector.service.js';
import ChatSession from '../models/ChatSession.model.js';
import Project from '../models/Project.model.js';
import Document from '../models/Document.model.js';

/**
 * Retrieve context for Global Bot mode
 * Searches across all documents in the organization (all projects)
 */
export const retrieveContextGlobal = async (organizationId, query, topK = 5) => {
  try {
    // Validate inputs
    if (!organizationId) {
      throw new Error('organizationId is required');
    }

    console.log('🔍 Global Bot Retrieval:', {
      organizationId: organizationId.toString(),
      query,
      topK
    });

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Query vectors from ALL projects in the organization
    const results = await queryVectorsGlobal(organizationId, queryEmbedding, topK);

    console.log('📊 Vector search results:', {
      count: results.length,
      results: results.map(r => ({
        score: r.score,
        fileName: r.fileName,
        projectId: r.projectId?.toString(),
        text: r.text.substring(0, 100)
      }))
    });

    // Enrich with document and project details
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        const document = await Document.findById(result.documentId);
        const project = await Project.findById(result.projectId);
        
        return {
          ...result,
          documentName: document?.fileName || 'Unknown',
          projectName: project?.name || 'Unknown Project',
          category: document?.category || 'other'
        };
      })
    );

    return enrichedResults;
  } catch (error) {
    console.error('Global context retrieval error:', error);
    return [];
  }
};

/**
 * Retrieve context for Project Bot mode
 * Searches ONLY within the specified project
 */
export const retrieveContextProject = async (organizationId, projectId, query, topK = 5) => {
  try {
    // Validate inputs
    if (!organizationId) {
      throw new Error('organizationId is required');
    }
    if (!projectId) {
      throw new Error('projectId is required for Project Bot mode');
    }

    console.log('🔍 Project Bot Retrieval:', {
      organizationId: organizationId.toString(),
      projectId: projectId.toString(),
      query,
      topK
    });

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Query vectors ONLY from the specified project
    const results = await queryVectorsProject(organizationId, projectId, queryEmbedding, topK);

    console.log('📊 Vector search results:', {
      count: results.length,
      results: results.map(r => ({
        score: r.score,
        fileName: r.fileName,
        projectId: r.projectId?.toString(),
        text: r.text.substring(0, 100)
      }))
    });

    // Enrich with document details
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        const document = await Document.findById(result.documentId);
        
        return {
          ...result,
          documentName: document?.fileName || 'Unknown',
          category: document?.category || 'other'
        };
      })
    );

    return enrichedResults;
  } catch (error) {
    console.error('Project context retrieval error:', error);
    return [];
  }
};

/**
 * Build prompt with context for Global Bot
 */
export const buildPromptGlobal = (query, contextResults, conversationHistory = []) => {
  const systemPrompt = `You are PropMind AI, an intelligent real estate assistant with access to ALL documents across the entire organization. You help users find properties, answer questions about real estate projects, and provide accurate information based on documents from all projects in the organization.

Guidelines:
- Always cite your sources with project names when providing information
- If you don't know something, say so clearly
- Be professional and helpful
- Focus on real estate and property-related queries
- Provide specific details like prices, locations, amenities when available
- When information comes from multiple projects, clearly indicate which project each piece of information is from
- You have access to ALL projects in the organization, not just the user's assigned projects`;

  // Build context from retrieved documents
  let contextText = '';
  if (contextResults && contextResults.length > 0) {
    contextText = '\n\nRelevant Information from Organization Projects:\n';
    contextResults.forEach((result, idx) => {
      contextText += `\n[Source ${idx + 1}: ${result.documentName} from ${result.projectName}]\n${result.text}\n`;
    });
  } else {
    contextText = '\n\nNo relevant information found in the organization documents.';
  }

  // Build messages array
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add conversation history (last 10 messages)
  const recentHistory = conversationHistory.slice(-10);
  messages.push(...recentHistory);

  // Add current query with context
  const userMessage = `${contextText}\n\nUser Question: ${query}`;
  messages.push({ role: 'user', content: userMessage });

  return messages;
};

/**
 * Build prompt with context for Project Bot
 */
export const buildPromptProject = (query, contextResults, projectName, conversationHistory = []) => {
  const systemPrompt = `You are PropMind AI, an intelligent real estate assistant focused on the "${projectName}" project. You help users find information specific to this project and answer questions based on the project's documents.

Guidelines:
- Always cite your sources when providing information
- If you don't know something, say so clearly and mention that you only have access to ${projectName} documents
- Be professional and helpful
- Focus on real estate and property-related queries specific to ${projectName}
- Provide specific details like prices, locations, amenities when available
- NEVER provide information from other projects - only use ${projectName} documents`;

  // Build context from retrieved documents
  let contextText = '';
  if (contextResults && contextResults.length > 0) {
    contextText = `\n\nRelevant Information from ${projectName}:\n`;
    contextResults.forEach((result, idx) => {
      contextText += `\n[Source ${idx + 1}: ${result.documentName}]\n${result.text}\n`;
    });
  } else {
    contextText = `\n\nNo relevant information found in ${projectName} documents.`;
  }

  // Build messages array
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add conversation history (last 10 messages)
  const recentHistory = conversationHistory.slice(-10);
  messages.push(...recentHistory);

  // Add current query with context
  const userMessage = `${contextText}\n\nUser Question: ${query}`;
  messages.push({ role: 'user', content: userMessage });

  return messages;
};

/**
 * Format sources for response
 */
export const formatSources = (contextResults, includeProjectName = false) => {
  return contextResults.map((result, idx) => ({
    documentId: result.documentId,
    fileName: result.documentName,
    projectId: result.projectId,
    projectName: includeProjectName ? result.projectName : undefined,
    pageNumber: result.pageNumber || 0,
    relevanceScore: result.score,
    excerpt: result.text.substring(0, 200) + '...'
  }));
};

/**
 * Generate RAG response for Global Bot
 */
export const generateGlobalBotResponse = async (
  organizationId,
  query,
  sessionId = null
) => {
  const startTime = Date.now();

  try {
    // Retrieve context from ALL projects in the organization
    const contextResults = await retrieveContextGlobal(organizationId, query);

    // Get conversation history if session exists
    let conversationHistory = [];
    if (sessionId) {
      const session = await ChatSession.findById(sessionId);
      if (session && session.chatMode === 'global') {
        conversationHistory = session.getContextWindow().map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      }
    }

    // Build prompt
    const messages = buildPromptGlobal(query, contextResults, conversationHistory);

    // Generate response
    const response = await generateStreamingChatCompletion(messages);

    // Format sources with project names
    const sources = formatSources(contextResults, true);

    const latency = Date.now() - startTime;

    return {
      stream: response,
      sources,
      latency,
      contextResults
    };
  } catch (error) {
    console.error('Global Bot RAG error:', error);
    throw new Error('Failed to generate response');
  }
};

/**
 * Generate RAG response for Project Bot
 */
export const generateProjectBotResponse = async (
  organizationId,
  projectId,
  query,
  sessionId = null
) => {
  const startTime = Date.now();

  try {
    // Get project details
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Retrieve context from the specific project ONLY
    const contextResults = await retrieveContextProject(organizationId, projectId, query);

    // Get conversation history if session exists
    let conversationHistory = [];
    if (sessionId) {
      const session = await ChatSession.findById(sessionId);
      if (session && session.chatMode === 'project' && session.projectId?.toString() === projectId.toString()) {
        conversationHistory = session.getContextWindow().map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      }
    }

    // Build prompt
    const messages = buildPromptProject(query, contextResults, project.name, conversationHistory);

    // Generate response
    const response = await generateStreamingChatCompletion(messages);

    // Format sources without project names (all from same project)
    const sources = formatSources(contextResults, false);

    const latency = Date.now() - startTime;

    return {
      stream: response,
      sources,
      latency,
      contextResults,
      projectName: project.name
    };
  } catch (error) {
    console.error('Project Bot RAG error:', error);
    throw new Error('Failed to generate response');
  }
};

/**
 * Get user's authorized project IDs
 */
export const getUserAuthorizedProjects = async (user, organizationId) => {
  try {
    // SUPER_ADMIN and ORG_OWNER have access to all projects
    if (user.role === 'SUPER_ADMIN' || user.role === 'ORG_OWNER') {
      const allProjects = await Project.find({ organizationId, isDeleted: false }).select('_id');
      return allProjects.map(p => p._id);
    }

    // ORG_ADMIN has access to all organization projects
    if (user.role === 'ORG_ADMIN') {
      const allProjects = await Project.find({ organizationId, isDeleted: false }).select('_id');
      return allProjects.map(p => p._id);
    }

    // Other roles: get projects where user is in assignedAgents
    const assignedProjects = await Project.find({
      organizationId,
      assignedAgents: user._id,
      isDeleted: false
    }).select('_id');

    return assignedProjects.map(p => p._id);
  } catch (error) {
    console.error('Error getting authorized projects:', error);
    return [];
  }
};

/**
 * Validate user has access to project
 */
export const validateProjectAccess = async (user, organizationId, projectId) => {
  try {
    // SUPER_ADMIN and ORG_OWNER have access to all projects
    if (user.role === 'SUPER_ADMIN' || user.role === 'ORG_OWNER') {
      return true;
    }

    // ORG_ADMIN has access to all organization projects
    if (user.role === 'ORG_ADMIN') {
      const project = await Project.findOne({ _id: projectId, organizationId, isDeleted: false });
      return !!project;
    }

    // Other roles: check if user is in assignedAgents
    const project = await Project.findOne({
      _id: projectId,
      organizationId,
      assignedAgents: user._id,
      isDeleted: false
    });

    return !!project;
  } catch (error) {
    console.error('Error validating project access:', error);
    return false;
  }
};
