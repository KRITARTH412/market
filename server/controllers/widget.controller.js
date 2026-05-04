import { validationResult } from 'express-validator';
import Lead from '../models/Lead.model.js';
import ChatSession from '../models/ChatSession.model.js';
import { generateRAGResponse, saveChatInteraction } from '../services/rag.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const getWidgetConfig = asyncHandler(async (req, res) => {
  res.json({
    organizationId: req.organizationId,
    organizationName: req.organization.name,
    primaryColor: req.organization.primaryColor,
    logoUrl: req.organization.logoUrl,
    welcomeMessage: 'Hello! How can I help you find your dream property today?'
  });
});

export const captureWidgetLead = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, phone, email } = req.body;

  // Check if lead already exists
  let lead = await Lead.findOne({
    organizationId: req.organizationId,
    phone,
    isDeleted: false
  });

  if (!lead) {
    lead = new Lead({
      organizationId: req.organizationId,
      name,
      phone,
      email: email || null,
      source: 'chatbot'
    });

    await lead.calculateScore();
    await lead.save();
  }

  res.status(201).json({
    message: 'Lead captured successfully',
    leadId: lead._id
  });
});

export const widgetChat = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { message, sessionId, leadId } = req.body;

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Get or create session
    let session;
    if (sessionId) {
      session = await ChatSession.findById(sessionId);
    }

    if (!session) {
      session = new ChatSession({
        organizationId: req.organizationId,
        leadId: leadId || null,
        source: 'widget'
      });
      await session.save();
    }

    // Generate RAG response
    const { stream, sources } = await generateRAGResponse(
      req.organizationId,
      message,
      session._id,
      null,
      null,
      leadId
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

    // Send session ID
    res.write(`data: ${JSON.stringify({ sessionId: session._id, type: 'session' })}\n\n`);

    // Send done signal
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);

    // Save interaction
    await saveChatInteraction(
      req.organizationId,
      session._id,
      message,
      fullResponse,
      sources,
      {},
      null,
      leadId
    );

    // Update lead query history
    if (leadId) {
      const lead = await Lead.findById(leadId);
      if (lead) {
        lead.queryHistory.push({
          query: message,
          answer: fullResponse,
          timestamp: new Date()
        });
        await lead.calculateScore();
        await lead.save();
      }
    }

    // Increment query count
    await req.organization.incrementUsage('monthlyQueryCount');

    res.end();
  } catch (error) {
    console.error('Widget chat error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message, type: 'error' })}\n\n`);
    res.end();
  }
});
