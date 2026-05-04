import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  refreshToken,
  logout,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  getCurrentUser
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

// Register organization and owner
router.post(
  '/register',
  authRateLimiter,
  [
    body('organizationName').trim().notEmpty().withMessage('Organization name is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  register
);

// Login
router.post(
  '/login',
  authRateLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  login
);

// Refresh access token
router.post('/refresh', refreshToken);

// Logout
router.post('/logout', authenticate, logout);

// Request password reset
router.post(
  '/password-reset/request',
  authRateLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required')
  ],
  requestPasswordReset
);

// Reset password
router.post(
  '/password-reset/confirm',
  authRateLimiter,
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  resetPassword
);

// Verify email
router.get('/verify-email/:token', verifyEmail);

// Get current user
router.get('/me', authenticate, getCurrentUser);

export default router;
