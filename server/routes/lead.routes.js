import express from 'express';
import { body } from 'express-validator';
import {
  getLeads,
  createLead,
  getLead,
  updateLead,
  deleteLead,
  assignLead,
  calculateLeadScore,
  addNote,
  updateStatus,
  importLeads
} from '../controllers/lead.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(authenticate);

// Get all leads
router.get('/', authorize('leads', 'view_assigned_leads'), getLeads);

// Create lead
router.post(
  '/',
  authorize('leads'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('email').optional().isEmail()
  ],
  createLead
);

// Import leads from CSV
router.post(
  '/import',
  authorize('leads'),
  upload.single('file'),
  importLeads
);

// Get single lead
router.get('/:id', authorize('leads', 'view_assigned_leads'), getLead);

// Update lead
router.patch('/:id', authorize('leads'), updateLead);

// Delete lead
router.delete('/:id', authorize('leads'), deleteLead);

// Assign lead to agent
router.post(
  '/:id/assign',
  authorize('leads'),
  [
    body('agentId').isMongoId().withMessage('Valid agent ID is required')
  ],
  assignLead
);

// Calculate lead score
router.post('/:id/score', authorize('leads'), calculateLeadScore);

// Add note to lead
router.post(
  '/:id/notes',
  authorize('leads', 'view_assigned_leads'),
  [
    body('text').trim().notEmpty().withMessage('Note text is required')
  ],
  addNote
);

// Update lead status
router.patch(
  '/:id/status',
  authorize('leads', 'view_assigned_leads'),
  [
    body('status').isIn(['new', 'contacted', 'qualified', 'site_visit', 'negotiating', 'closed_won', 'closed_lost']).withMessage('Invalid status')
  ],
  updateStatus
);

export default router;
