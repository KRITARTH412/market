import { validationResult } from 'express-validator';
import Lead from '../models/Lead.model.js';
import User from '../models/User.model.js';
import { createAuditLog } from '../middleware/auditLog.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendEmail, emailTemplates } from '../utils/email.utils.js';
import csv from 'csv-parser';
import { Readable } from 'stream';

// Get all leads
export const getLeads = asyncHandler(async (req, res) => {
  const { status, source, assignedAgent, minScore, maxScore } = req.query;

  const filter = {
    organizationId: req.organizationId,
    isDeleted: false
  };

  // If user is SALES_AGENT, only show assigned leads
  if (req.user.role === 'SALES_AGENT') {
    filter.assignedAgentId = req.userId;
  }

  if (status) filter.status = status;
  if (source) filter.source = source;
  if (assignedAgent) filter.assignedAgentId = assignedAgent;
  if (minScore) filter.score = { $gte: parseInt(minScore) };
  if (maxScore) filter.score = { ...filter.score, $lte: parseInt(maxScore) };

  const leads = await Lead.find(filter)
    .populate('assignedAgentId', 'name email')
    .populate('projectsInterested', 'name location')
    .sort({ score: -1, createdAt: -1 });

  res.json({ leads });
});

// Create lead
export const createLead = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const lead = new Lead({
    ...req.body,
    organizationId: req.organizationId,
    source: req.body.source || 'manual'
  });

  // Calculate initial score
  await lead.calculateScore();
  await lead.save();

  await createAuditLog('lead.create', req, { leadName: lead.name }, 'lead', lead._id);

  res.status(201).json({
    message: 'Lead created successfully',
    lead
  });
});

// Get single lead
export const getLead = asyncHandler(async (req, res) => {
  const filter = {
    _id: req.params.id,
    organizationId: req.organizationId,
    isDeleted: false
  };

  // If SALES_AGENT, only show if assigned
  if (req.user.role === 'SALES_AGENT') {
    filter.assignedAgentId = req.userId;
  }

  const lead = await Lead.findOne(filter)
    .populate('assignedAgentId', 'name email')
    .populate('projectsInterested', 'name location coverImage')
    .populate('notes.createdBy', 'name')
    .populate('activities.performedBy', 'name');

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  res.json({ lead });
});

// Update lead
export const updateLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({
    _id: req.params.id,
    organizationId: req.organizationId,
    isDeleted: false
  });

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  Object.keys(req.body).forEach(key => {
    if (req.body[key] !== undefined && key !== 'score') {
      lead[key] = req.body[key];
    }
  });

  await lead.calculateScore();
  await lead.save();

  await createAuditLog('lead.update', req, { updates: req.body }, 'lead', lead._id);

  res.json({
    message: 'Lead updated successfully',
    lead
  });
});

// Delete lead
export const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({
    _id: req.params.id,
    organizationId: req.organizationId,
    isDeleted: false
  });

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  lead.isDeleted = true;
  await lead.save();

  res.json({ message: 'Lead deleted successfully' });
});

// Assign lead to agent
export const assignLead = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { agentId } = req.body;

  const lead = await Lead.findOne({
    _id: req.params.id,
    organizationId: req.organizationId,
    isDeleted: false
  });

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  // Verify agent
  const agent = await User.findOne({
    _id: agentId,
    organizationId: req.organizationId,
    role: 'SALES_AGENT',
    isActive: true,
    isDeleted: false
  });

  if (!agent) {
    return res.status(400).json({ error: 'Invalid agent ID' });
  }

  lead.assignedAgentId = agentId;
  lead.activities.push({
    type: 'status_change',
    description: `Lead assigned to ${agent.name}`,
    performedBy: req.userId
  });
  await lead.save();

  // Send notification email
  const emailContent = emailTemplates.leadAssignment(agent.name, lead.name, lead.phone);
  await sendEmail(agent.email, emailContent.subject, emailContent.html);

  await createAuditLog('lead.assign', req, { agentId, agentName: agent.name }, 'lead', lead._id);

  res.json({
    message: 'Lead assigned successfully',
    lead
  });
});

// Calculate lead score
export const calculateLeadScore = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({
    _id: req.params.id,
    organizationId: req.organizationId,
    isDeleted: false
  });

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const score = await lead.calculateScore();
  await lead.save();

  res.json({
    score,
    scoreFactors: lead.scoreFactors
  });
});

// Add note to lead
export const addNote = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { text } = req.body;

  const filter = {
    _id: req.params.id,
    organizationId: req.organizationId,
    isDeleted: false
  };

  if (req.user.role === 'SALES_AGENT') {
    filter.assignedAgentId = req.userId;
  }

  const lead = await Lead.findOne(filter);

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  lead.notes.push({
    text,
    createdBy: req.userId,
    createdAt: new Date()
  });

  lead.activities.push({
    type: 'note_added',
    description: 'Note added',
    performedBy: req.userId
  });

  await lead.save();

  res.json({
    message: 'Note added successfully',
    note: lead.notes[lead.notes.length - 1]
  });
});

// Update lead status
export const updateStatus = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { status } = req.body;

  const filter = {
    _id: req.params.id,
    organizationId: req.organizationId,
    isDeleted: false
  };

  if (req.user.role === 'SALES_AGENT') {
    filter.assignedAgentId = req.userId;
  }

  const lead = await Lead.findOne(filter);

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const oldStatus = lead.status;
  lead.status = status;

  if (status === 'closed_won' || status === 'closed_lost') {
    lead.outcomeDate = new Date();
  }

  lead.activities.push({
    type: 'status_change',
    description: `Status changed from ${oldStatus} to ${status}`,
    performedBy: req.userId
  });

  await lead.calculateScore();
  await lead.save();

  await createAuditLog('lead.status_change', req, { oldStatus, newStatus: status }, 'lead', lead._id);

  res.json({
    message: 'Status updated successfully',
    lead
  });
});

// Import leads from CSV
export const importLeads = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const leads = [];
  const errors = [];

  const stream = Readable.from(req.file.buffer);
  
  stream
    .pipe(csv())
    .on('data', (row) => {
      if (row.name && row.phone) {
        leads.push({
          organizationId: req.organizationId,
          name: row.name,
          phone: row.phone,
          email: row.email || null,
          source: 'import',
          budget: {
            min: row.minBudget ? parseInt(row.minBudget) : null,
            max: row.maxBudget ? parseInt(row.maxBudget) : null
          },
          preferredLocation: row.location || null,
          bhkType: row.bhkType || null
        });
      } else {
        errors.push(`Invalid row: ${JSON.stringify(row)}`);
      }
    })
    .on('end', async () => {
      try {
        const createdLeads = await Lead.insertMany(leads);
        
        // Calculate scores for all
        for (const lead of createdLeads) {
          await lead.calculateScore();
          await lead.save();
        }

        res.json({
          message: 'Leads imported successfully',
          imported: createdLeads.length,
          errors: errors.length > 0 ? errors : undefined
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to import leads', details: error.message });
      }
    });
});
