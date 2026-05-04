import express from 'express';
import { body } from 'express-validator';
import { searchProperties } from '../controllers/search.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Natural language property search
router.post(
  '/',
  authorize('chat'),
  [
    body('query').trim().notEmpty().withMessage('Search query is required')
  ],
  searchProperties
);

export default router;
