import express from 'express';
import { body } from 'express-validator';
import {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  assignAgents
} from '../controllers/project.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { checkProjectLimit } from '../middleware/usageCheck.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all projects
router.get('/', getProjects);

// Create project
router.post(
  '/',
  authorize('settings'),
  checkProjectLimit,
  [
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('location.city').optional().trim(),
    body('status').optional().isIn(['planning', 'under_construction', 'ready_to_move', 'completed'])
  ],
  createProject
);

// Get single project
router.get('/:id', getProject);

// Update project
router.patch(
  '/:id',
  authorize('settings'),
  updateProject
);

// Delete project
router.delete('/:id', authorize('settings'), deleteProject);

// Assign agents to project
router.post(
  '/:id/agents',
  authorize('settings'),
  [
    body('agentIds').isArray().withMessage('Agent IDs must be an array')
  ],
  assignAgents
);

export default router;
