import { validationResult } from 'express-validator';
import ChatSession from '../models/ChatSession.model.js';
import { generateRAGResponse, saveChatInteraction, generateFollowUpQuestions } from '../services/rag.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Send message (streaming)
export const sendMessage = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let { message, sessionId, projectId } = req.body;

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Create a new session if sessionId is not provided
    if (!sessionId) {
      const newSession = new ChatSession({
        organizationId: req.organizationId,
        userId: req.userId,
        projectId: projectId || null,
        source: 'internal'
      });
      await newSession.save();
      sessionId = newSession._id.toString();
      
      // Send session ID to client
      res.write(`data: ${JSON.stringify({ sessionId, type: 'session' })}\n\n`);
    }

    // Generate RAG response
    const { stream, sources, latency } = await generateRAGResponse(
      req.organizationId,
      message,
      sessionId,
      projectId,
      req.userId
    );

    let fullResponse = '';

    // Stream response
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content, type: 'chunk' })}\n\n`);
      }
    }

    // Send sources
    res.write(`data: ${JSON.stringify({ sources, type: 'sources' })}\n\n`);

    // Generate follow-up questions
    const followUpQuestions = await generateFollowUpQuestions(message, fullResponse, sources);
    res.write(`data: ${JSON.stringify({ questions: followUpQuestions, type: 'followup' })}\n\n`);

    // Send done signal
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);

    // Save interaction
    await saveChatInteraction(
      req.organizationId,
      sessionId,
      message,
      fullResponse,
      sources,
      { latency },
      req.userId,
      null,
      projectId
    );

    // Increment query count
    await req.organization.incrementUsage('monthlyQueryCount');

    res.end();
  } catch (error) {
    console.error('Chat error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message, type: 'error' })}\n\n`);
    res.end();
  }
});

// Get all sessions
export const getSessions = asyncHandler(async (req, res) => {
  const { projectId, source } = req.query;

  const filter = {
    organizationId: req.organizationId,
    userId: req.userId,
    isDeleted: false
  };

  if (projectId) filter.projectId = projectId;
  if (source) filter.source = source;

  const sessions = await ChatSession.find(filter)
    .populate('projectId', 'name')
    .sort({ updatedAt: -1 })
    .limit(50);

  res.json({
    sessions: sessions.map(session => ({
      id: session._id,
      projectId: session.projectId,
      source: session.source,
      messageCount: session.messages.length,
      lastMessage: session.messages[session.messages.length - 1],
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    }))
  });
});

// Create new session
export const createSession = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { projectId } = req.body;

  const session = new ChatSession({
    organizationId: req.organizationId,
    userId: req.userId,
    projectId: projectId || null,
    source: 'internal'
  });

  await session.save();

  res.status(201).json({
    message: 'Session created successfully',
    session: {
      id: session._id,
      projectId: session.projectId,
      createdAt: session.createdAt
    }
  });
});

// Get single session
export const getSession = asyncHandler(async (req, res) => {
  const session = await ChatSession.findOne({
    _id: req.params.id,
    organizationId: req.organizationId,
    userId: req.userId,
    isDeleted: false
  }).populate('projectId', 'name');

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({ session });
});

// Delete session
export const deleteSession = asyncHandler(async (req, res) => {
  const session = await ChatSession.findOne({
    _id: req.params.id,
    organizationId: req.organizationId,
    userId: req.userId,
    isDeleted: false
  });

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.isDeleted = true;
  await session.save();

  res.json({ message: 'Session deleted successfully' });
});
