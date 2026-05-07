import express from 'express';
import multer from 'multer';
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

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// All routes require authentication
router.use(authenticate);

// Get all projects
router.get('/', getProjects);

// Create project with file uploads
router.post(
  '/',
  authorize('settings'),
  checkProjectLimit,
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'images', maxCount: 10 }
  ]),
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
