import { validationResult } from 'express-validator';
import Project from '../models/Project.model.js';
import User from '../models/User.model.js';
import Organization from '../models/Organization.model.js';
import { createAuditLog } from '../middleware/auditLog.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Get all projects
export const getProjects = asyncHandler(async (req, res) => {
  const { status, city, assignedAgent } = req.query;
  
  const filter = {
    organizationId: req.organizationId,
    isDeleted: false
  };

  if (status) filter.status = status;
  if (city) filter['location.city'] = new RegExp(city, 'i');
  if (assignedAgent) filter.assignedAgents = assignedAgent;

  const projects = await Project.find(filter)
    .populate('assignedAgents', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ projects });
});

// Create project
export const createProject = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const project = new Project({
    ...req.body,
    organizationId: req.organizationId,
    createdBy: req.userId
  });

  await project.save();

  // Increment project count
  await req.organization.incrementUsage('projectCount');

  await createAuditLog('project.create', req, { projectName: project.name }, 'project', project._id);

  res.status(201).json({
    message: 'Project created successfully',
    project
  });
});

// Get single project
export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    organizationId: req.organizationId,
    isDeleted: false
  })
    .populate('assignedAgents', 'name email role')
    .populate('createdBy', 'name email');

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  res.json({ project });
});

// Update project
export const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    organizationId: req.organizationId,
    isDeleted: false
  });

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Update fields
  Object.keys(req.body).forEach(key => {
    if (req.body[key] !== undefined) {
      project[key] = req.body[key];
    }
  });

  await project.save();

  await createAuditLog('project.update', req, { updates: req.body }, 'project', project._id);

  res.json({
    message: 'Project updated successfully',
    project
  });
});

// Delete project
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    organizationId: req.organizationId,
    isDeleted: false
  });

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  project.isDeleted = true;
  await project.save();

  // Decrement project count
  const organization = await Organization.findById(req.organizationId);
  if (organization.usage.projectCount > 0) {
    organization.usage.projectCount--;
    await organization.save();
  }

  await createAuditLog('project.delete', req, { projectName: project.name }, 'project', project._id);

  res.json({ message: 'Project deleted successfully' });
});

// Assign agents to project
export const assignAgents = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { agentIds } = req.body;

  const project = await Project.findOne({
    _id: req.params.id,
    organizationId: req.organizationId,
    isDeleted: false
  });

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Verify all agents belong to organization and have SALES_AGENT role
  const agents = await User.find({
    _id: { $in: agentIds },
    organizationId: req.organizationId,
    role: 'SALES_AGENT',
    isActive: true,
    isDeleted: false
  });

  if (agents.length !== agentIds.length) {
    return res.status(400).json({ error: 'Some agent IDs are invalid' });
  }

  project.assignedAgents = agentIds;
  await project.save();

  res.json({
    message: 'Agents assigned successfully',
    project
  });
});
