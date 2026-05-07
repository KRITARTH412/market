import { generateEmbedding, generateStreamingChatCompletion, countTokens } from './openai.service.js';
import { queryVectors } from './vector.service.js';
import ChatSession from '../models/ChatSession.model.js';
import QueryLog from '../models/QueryLog.model.js';
import Document from '../models/Document.model.js';

// Retrieve relevant context from vector store
export const retrieveContext = async (organizationId, query, projectId = null, topK = 5) => {
  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Build filter
    const filter = {};
    if (projectId) {
      filter.projectId = projectId.toString();
    }

    // Query Pinecone
    const results = await queryVectors(organizationId, queryEmbedding, topK, filter);

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
    console.error('Context retrieval error:', error);
    // Return empty array instead of throwing - allows chat to work without documents
    console.log('Continuing without document context...');
    return [];
  }
};

// Build prompt with context
export const buildPrompt = (query, contextResults, conversationHistory = []) => {
  const systemPrompt = `You are PropMind AI, an intelligent real estate assistant. You help users find properties, answer questions about real estate projects, and provide accurate information based on the documents provided.

Guidelines:
- Always cite your sources when providing information
- If you don't know something, say so clearly
- Be professional and helpful
- Focus on real estate and property-related queries
- Provide specific details like prices, locations, amenities when available`;

  // Build context from retrieved documents
  let contextText = '';
  if (contextResults && contextResults.length > 0) {
    contextText = '\n\nRelevant Information:\n';
    contextResults.forEach((result, idx) => {
      contextText += `\n[Source ${idx + 1}: ${result.documentName}]\n${result.text}\n`;
    });
  } else {
    contextText = '\n\nNote: No specific documents are currently available. Provide general real estate information and guidance.';
  }

  // Build messages array
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add conversation history (last 10 messages)
  const recentHistory = conversationHistory.slice(-10);
  messages.push(...recentHistory);

  // Add current query with context
  const userMessage = contextText 
    ? `${contextText}\n\nUser Question: ${query}`
    : query;
  
  messages.push({ role: 'user', content: userMessage });

  return messages;
};

// Format sources for response
export const formatSources = (contextResults) => {
  return contextResults.map((result, idx) => ({
    documentId: result.documentId,
    fileName: result.documentName,
    pageNumber: result.pageNumber || 0,
    relevanceScore: result.score,
    excerpt: result.text.substring(0, 200) + '...'
  }));
};

// Generate RAG response
export const generateRAGResponse = async (
  organizationId,
  query,
  sessionId = null,
  projectId = null,
  userId = null,
  leadId = null
) => {
  const startTime = Date.now();

  try {
    // Retrieve context
    const contextResults = await retrieveContext(organizationId, query, projectId);

    // Get conversation history if session exists
    let conversationHistory = [];
    if (sessionId) {
      const session = await ChatSession.findById(sessionId);
      if (session) {
        conversationHistory = session.getContextWindow().map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      }
    }

    // Build prompt
    const messages = buildPrompt(query, contextResults, conversationHistory);

    // Generate response
    const response = await generateStreamingChatCompletion(messages);

    // Format sources
    const sources = formatSources(contextResults);

    const latency = Date.now() - startTime;

    return {
      stream: response,
      sources,
      latency,
      contextResults
    };
  } catch (error) {
    console.error('RAG response error:', error);
    throw new Error('Failed to generate response');
  }
};

// Save chat interaction
export const saveChatInteraction = async (
  organizationId,
  sessionId,
  query,
  answer,
  sources,
  tokensUsed,
  userId = null,
  leadId = null,
  projectId = null
) => {
  try {
    // Update chat session
    if (sessionId) {
      const session = await ChatSession.findById(sessionId);
      if (session) {
        session.addMessage('user', query, [], countTokens(query));
        session.addMessage('assistant', answer, sources, countTokens(answer));
        await session.save();
      }
    }

    // Create query log
    await QueryLog.create({
      organizationId,
      userId,
      leadId,
      sessionId,
      query,
      answer,
      sources: sources.map(s => ({
        documentId: s.documentId,
        fileName: s.fileName,
        relevanceScore: s.relevanceScore
      })),
      tokensUsed: {
        prompt: tokensUsed.prompt || countTokens(query),
        completion: tokensUsed.completion || countTokens(answer),
        total: tokensUsed.total || (countTokens(query) + countTokens(answer))
      },
      latencyMs: tokensUsed.latency || 0,
      metadata: {
        projectId
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Save interaction error:', error);
    return { success: false, error: error.message };
  }
};

// Generate suggested follow-up questions
export const generateFollowUpQuestions = async (query, answer, contextResults) => {
  try {
    const prompt = `Based on this conversation, suggest 3 relevant follow-up questions the user might ask:

User Question: ${query}
Assistant Answer: ${answer}

Provide only the questions, one per line, without numbering.`;

    const messages = [
      { role: 'system', content: 'You are a helpful assistant that suggests relevant follow-up questions.' },
      { role: 'user', content: prompt }
    ];

    const response = await generateStreamingChatCompletion(messages);
    
    // Collect full response
    let fullResponse = '';
    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
    }

    // Parse questions
    const questions = fullResponse
      .split('\n')
      .filter(q => q.trim())
      .slice(0, 3);

    return questions;
  } catch (error) {
    console.error('Follow-up generation error:', error);
    return [];
  }
};
