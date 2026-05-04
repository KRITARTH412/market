import { validationResult } from 'express-validator';
import FollowUp from '../models/FollowUp.model.js';
import Lead from '../models/Lead.model.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const getFollowUps = asyncHandler(async (req, res) => {
  const { leadId, status } = req.query;
  const filter = { organizationId: req.organizationId, isDeleted: false };
  if (leadId) filter.leadId = leadId;
  if (status) filter.status = status;
  
  const followUps = await FollowUp.find(filter)
    .populate('leadId', 'name phone email')
    .populate('createdBy', 'name')
    .sort({ nextRunAt: 1 });
  
  res.json({ followUps });
});

export const createFollowUp = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { leadId, sequence } = req.body;
  
  const lead = await Lead.findOne({ _id: leadId, organizationId: req.organizationId });
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const firstStep = sequence[0];
  const nextRunAt = new Date(Date.now() + firstStep.delayDays * 24 * 60 * 60 * 1000);

  const followUp = new FollowUp({
    organizationId: req.organizationId,
    leadId,
    sequence: sequence.map((step, idx) => ({ ...step, step: idx })),
    nextRunAt,
    createdBy: req.userId
  });

  await followUp.save();
  res.status(201).json({ message: 'Follow-up created', followUp });
});

export const getFollowUp = asyncHandler(async (req, res) => {
  const followUp = await FollowUp.findOne({
    _id: req.params.id,
    organizationId: req.organizationId
  }).populate('leadId').populate('createdBy', 'name');
  
  if (!followUp) {
    return res.status(404).json({ error: 'Follow-up not found' });
  }
  res.json({ followUp });
});

export const pauseFollowUp = asyncHandler(async (req, res) => {
  const followUp = await FollowUp.findOne({
    _id: req.params.id,
    organizationId: req.organizationId
  });
  
  if (!followUp) {
    return res.status(404).json({ error: 'Follow-up not found' });
  }

  followUp.status = 'paused';
  followUp.pausedBy = req.userId;
  followUp.pausedAt = new Date();
  await followUp.save();

  res.json({ message: 'Follow-up paused' });
});

export const resumeFollowUp = asyncHandler(async (req, res) => {
  const followUp = await FollowUp.findOne({
    _id: req.params.id,
    organizationId: req.organizationId
  });
  
  if (!followUp) {
    return res.status(404).json({ error: 'Follow-up not found' });
  }

  followUp.status = 'active';
  followUp.pausedBy = null;
  followUp.pausedAt = null;
  await followUp.save();

  res.json({ message: 'Follow-up resumed' });
});

export const cancelFollowUp = asyncHandler(async (req, res) => {
  const followUp = await FollowUp.findOne({
    _id: req.params.id,
    organizationId: req.organizationId
  });
  
  if (!followUp) {
    return res.status(404).json({ error: 'Follow-up not found' });
  }

  followUp.status = 'cancelled';
  await followUp.save();

  res.json({ message: 'Follow-up cancelled' });
});
