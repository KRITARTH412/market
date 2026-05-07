import ChatSession from '../models/ChatSession.model.js';
import Project from '../models/Project.model.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createAuditLog } from '../middleware/auditLog.middleware.js';
import {
  generateGlobalBotResponse,
  generateProjectBotResponse,
  getUserAuthorizedProjects,
  validateProjectAccess
} from '../services/ragDualMode.service.js';
import { countTokens } from '../services/openai.service.js';

/**
 * Create a new chat session (Global or Project mode)
 */
export const createChatSession = asyncHandler(async (req, res) => {
  const { chatMode, projectId } = req.body;

  // Validate chatMode
  if (!chatMode || !['global', 'project'].includes(chatMode)) {
    return res.status(400).json({ 
      error: 'Invalid chatMode. Must be "global" or "project"' 
    });
  }

  // Validate Global Bot access
  if (chatMode === 'global') {
    if (!req.user.hasGlobalBotAccess()) {
      await createAuditLog('chat.global_access_denied', req, {}, 'chat', null);
      return res.status(403).json({ 
        error: 'You do not have permission to access the organization-wide bot. Contact your administrator.' 
      });
    }
  }

  // Validate Project Bot access
  if (chatMode === 'project') {
    if (!projectId) {
      return res.status(400).json({ 
        error: 'projectId is required for Project Bot mode' 
      });
    }

    const hasAccess = await validateProjectAccess(req.user, req.organizationId, projectId);
    if (!hasAccess) {
      await createAuditLog('chat.project_access_denied', req, { projectId }, 'chat', null);
      return res.status(403).json({ 
        error: 'You do not have access to this project. Contact your project manager.' 
      });
    }
  }

  // Create chat session
  const session = new ChatSession({
    organizationId: req.organizationId,
    userId: req.userId,
    chatMode,
    projectId: chatMode === 'project' ? projectId : null,
    source: 'internal',
    isActive: true
  });

  await session.save();

  // Audit log
  await createAuditLog(
    chatMode === 'global' ? 'chat.global_session_created' : 'chat.project_session_created',
    req,
    { sessionId: session._id, projectId },
    'chat',
    session._id
  );

  // Populate project if needed
  if (chatMode === 'project') {
    await session.populate('projectId', 'name');
  }

  res.status(201).json({
    message: 'Chat session created successfully',
    session: {
      id: session._id,
      chatMode: session.chatMode,
      projectId: session.projectId,
      projectName: session.projectId?.name,
      createdAt: session.createdAt
    }
  });
});

/**
 * Send a message in a chat session
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Get session
  const session = await ChatSession.findOne({
    _id: sessionId,
    organizationId: req.organizationId,
    userId: req.userId,
    isActive: true,
    isDeleted: false
  }).populate('projectId', 'name');

  if (!session) {
    return res.status(404).json({ error: 'Chat session not found' });
  }

  // Validate access based on mode
  if (session.chatMode === 'global') {
    if (!req.user.hasGlobalBotAccess()) {
      return res.status(403).json({ 
        error: 'You do not have permission to use the global bot' 
      });
    }
  }

  if (session.chatMode === 'project') {
    // Extract the actual projectId (handle populated case)
    const projectIdToCheck = session.projectId?._id || session.projectId;
    const hasAccess = await validateProjectAccess(req.user, req.organizationId, projectIdToCheck);
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'You do not have access to this project' 
      });
    }
  }

  // Add user message to session
  session.addMessage('user', message, [], countTokens(message));
  await session.save();

  // Generate response based on mode
  let ragResponse;
  
  if (session.chatMode === 'global') {
    console.log('🌍 Using Global Bot - searching across all organization projects');
    
    // Generate global bot response (searches ALL projects in organization)
    ragResponse = await generateGlobalBotResponse(
      req.organizationId,
      message,
      sessionId
    );
  } else {
    // Generate project bot response
    // Extract the actual projectId (handle both populated and non-populated cases)
    const projectId = session.projectId?._id || session.projectId;
    
    console.log('🎯 Sending to Project Bot:', {
      sessionId,
      projectId: projectId.toString(),
      projectName: session.projectId?.name || 'Unknown',
      message
    });
    
    ragResponse = await generateProjectBotResponse(
      req.organizationId,
      projectId,
      message,
      sessionId
    );
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send sources first
  res.write(`data: ${JSON.stringify({ type: 'sources', sources: ragResponse.sources })}\n\n`);

  // Stream response
  let fullResponse = '';
  try {
    for await (const chunk of ragResponse.stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ type: 'content', content })}\n\n`);
      }
    }

    // Add assistant message to session
    session.addMessage('assistant', fullResponse, ragResponse.sources, countTokens(fullResponse));
    await session.save();

    // Send completion
    res.write(`data: ${JSON.stringify({ type: 'done', latency: ragResponse.latency })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to generate response' })}\n\n`);
    res.end();
  }
});

/**
 * Get chat sessions for the user
 */
export const getChatSessions = asyncHandler(async (req, res) => {
  const { chatMode, projectId } = req.query;

  const filter = {
    organizationId: req.organizationId,
    userId: req.userId,
    isDeleted: false
  };

  if (chatMode) {
    filter.chatMode = chatMode;
  }

  if (projectId) {
    filter.projectId = projectId;
  }

  const sessions = await ChatSession.find(filter)
    .populate('projectId', 'name')
    .sort({ updatedAt: -1 })
    .limit(50);

  res.json({
    sessions: sessions.map(s => ({
      id: s._id,
      chatMode: s.chatMode,
      projectId: s.projectId?._id,
      projectName: s.projectId?.name,
      messageCount: s.messages.length,
      lastMessage: s.messages[s.messages.length - 1]?.content.substring(0, 100),
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }))
  });
});

/**
 * Get a single chat session with messages
 */
export const getChatSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await ChatSession.findOne({
    _id: sessionId,
    organizationId: req.organizationId,
    userId: req.userId,
    isDeleted: false
  }).populate('projectId', 'name');

  if (!session) {
    return res.status(404).json({ error: 'Chat session not found' });
  }

  // Validate access
  if (session.chatMode === 'project') {
    const hasAccess = await validateProjectAccess(req.user, req.organizationId, session.projectId);
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'You do not have permission to view this chat session' 
      });
    }
  }

  res.json({
    session: {
      id: session._id,
      chatMode: session.chatMode,
      projectId: session.projectId?._id,
      projectName: session.projectId?.name,
      messages: session.messages,
      totalTokens: session.totalTokens,
      isActive: session.isActive,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    }
  });
});

/**
 * Delete a chat session
 */
export const deleteChatSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await ChatSession.findOne({
    _id: sessionId,
    organizationId: req.organizationId,
    userId: req.userId,
    isDeleted: false
  });

  if (!session) {
    return res.status(404).json({ error: 'Chat session not found' });
  }

  session.isDeleted = true;
  await session.save();

  await createAuditLog('chat.session_deleted', req, { sessionId }, 'chat', sessionId);

  res.json({ message: 'Chat session deleted successfully' });
});

/**
 * Grant global bot access to a user (Admin only)
 */
export const grantGlobalBotAccess = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Check if requester has permission to grant
  if (!['ORG_OWNER', 'ORG_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'You do not have permission to grant global bot access' 
    });
  }

  // Get target user
  const targetUser = await req.user.constructor.findOne({
    _id: userId,
    organizationId: req.organizationId,
    isDeleted: false
  });

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Grant permission
  targetUser.grantPermission('GLOBAL_BOT_ACCESS');
  await targetUser.save();

  await createAuditLog('permission.granted', req, {
    targetUserId: userId,
    permission: 'GLOBAL_BOT_ACCESS'
  }, 'user', userId);

  res.json({
    message: 'Global bot access granted successfully',
    user: {
      id: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      permissions: targetUser.permissions
    }
  });
});

/**
 * Revoke global bot access from a user (Admin only)
 */
export const revokeGlobalBotAccess = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Check if requester has permission to revoke
  if (!['ORG_OWNER', 'ORG_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'You do not have permission to revoke global bot access' 
    });
  }

  // Get target user
  const targetUser = await req.user.constructor.findOne({
    _id: userId,
    organizationId: req.organizationId,
    isDeleted: false
  });

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Revoke permission
  targetUser.revokePermission('GLOBAL_BOT_ACCESS');
  await targetUser.save();

  await createAuditLog('permission.revoked', req, {
    targetUserId: userId,
    permission: 'GLOBAL_BOT_ACCESS'
  }, 'user', userId);

  res.json({
    message: 'Global bot access revoked successfully',
    user: {
      id: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      permissions: targetUser.permissions
    }
  });
});
