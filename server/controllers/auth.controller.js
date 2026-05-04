import { validationResult } from 'express-validator';
import slugify from 'slugify';
import User from '../models/User.model.js';
import Organization from '../models/Organization.model.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, generatePasswordResetToken, generateEmailVerificationToken } from '../utils/jwt.utils.js';
import { validatePassword } from '../utils/validation.utils.js';
import { sendEmail, emailTemplates } from '../utils/email.utils.js';
import { createAuditLog } from '../middleware/auditLog.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Register organization and owner
export const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { organizationName, name, email, password } = req.body;

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ errors: passwordValidation.errors });
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // Generate unique slug
  let slug = slugify(organizationName, { lower: true, strict: true });
  let slugExists = await Organization.findOne({ slug });
  let counter = 1;
  
  while (slugExists) {
    slug = `${slugify(organizationName, { lower: true, strict: true })}-${counter}`;
    slugExists = await Organization.findOne({ slug });
    counter++;
  }

  // Create organization first (without ownerId)
  const organization = new Organization({
    name: organizationName,
    slug,
    plan: 'basic',
    ownerId: null // Will be updated after user creation
  });

  await organization.save();

  // Create owner user
  const user = new User({
    organizationId: organization._id,
    name,
    email: email.toLowerCase(),
    passwordHash: password, // Will be hashed by pre-save hook
    role: 'ORG_OWNER',
    isActive: true
  });

  await user.save();

  // Update organization with ownerId
  organization.ownerId = user._id;
  await organization.save();

  // Generate tokens
  const accessToken = generateAccessToken(user._id, organization._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();

  // Generate email verification token
  const verificationToken = generateEmailVerificationToken(user._id);
  user.emailVerificationToken = verificationToken;
  await user.save();

  // Send verification email
  const verificationLink = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
  const emailContent = emailTemplates.emailVerification(verificationLink);
  await sendEmail(user.email, emailContent.subject, emailContent.html);

  // Audit log
  await createAuditLog('auth.register', req, { email, organizationId: organization._id }, 'user', user._id);

  res.status(201).json({
    message: 'Registration successful',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: organization._id,
      organizationName: organization.name,
      organizationSlug: organization.slug
    },
    tokens: {
      accessToken,
      refreshToken
    }
  });
});

// Login
export const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
  if (!user) {
    await createAuditLog('auth.login', req, { email }, null, null, 'failure', 'Invalid credentials');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check if user is active
  if (!user.isActive) {
    await createAuditLog('auth.login', req, { email }, 'user', user._id, 'failure', 'Account deactivated');
    return res.status(403).json({ error: 'Account deactivated' });
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    await createAuditLog('auth.login', req, { email }, 'user', user._id, 'failure', 'Invalid credentials');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Get organization
  const organization = await Organization.findById(user.organizationId);
  if (!organization || organization.isDeleted) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id, organization._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token and last login
  user.refreshToken = refreshToken;
  user.lastLoginAt = new Date();
  await user.save();

  // Audit log
  await createAuditLog('auth.login', req, { email }, 'user', user._id);

  res.json({
    message: 'Login successful',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: organization._id,
      organizationName: organization.name,
      organizationSlug: organization.slug
    },
    tokens: {
      accessToken,
      refreshToken
    }
  });
});

// Refresh token
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);
  
  // Find user
  const user = await User.findById(decoded.userId);
  if (!user || user.refreshToken !== refreshToken) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  // Generate new tokens
  const newAccessToken = generateAccessToken(user._id, user.organizationId, user.role);
  const newRefreshToken = generateRefreshToken(user._id);

  // Update refresh token
  user.refreshToken = newRefreshToken;
  await user.save();

  // Audit log
  await createAuditLog('auth.token_refresh', req, {}, 'user', user._id);

  res.json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  });
});

// Logout
export const logout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  
  if (user) {
    user.refreshToken = null;
    await user.save();
    
    await createAuditLog('auth.logout', req, {}, 'user', user._id);
  }

  res.json({ message: 'Logout successful' });
});

// Request password reset
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
  
  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({ message: 'If the email exists, a reset link has been sent' });
  }

  // Generate reset token
  const resetToken = generatePasswordResetToken(user._id);
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
  await user.save();

  // Send reset email
  const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  const emailContent = emailTemplates.passwordReset(resetLink);
  await sendEmail(user.email, emailContent.subject, emailContent.html);

  // Audit log
  await createAuditLog('auth.password_reset', req, { email }, 'user', user._id);

  res.json({ message: 'If the email exists, a reset link has been sent' });
});

// Reset password
export const resetPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, newPassword } = req.body;

  // Validate password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ errors: passwordValidation.errors });
  }

  // Find user with valid reset token
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
    isDeleted: false
  });

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  // Update password
  user.passwordHash = newPassword; // Will be hashed by pre-save hook
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  user.refreshToken = null; // Invalidate all sessions
  await user.save();

  res.json({ message: 'Password reset successful' });
});

// Verify email
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const user = await User.findOne({
    emailVerificationToken: token,
    isDeleted: false
  });

  if (!user) {
    return res.status(400).json({ error: 'Invalid verification token' });
  }

  user.emailVerified = true;
  user.emailVerificationToken = null;
  await user.save();

  res.json({ message: 'Email verified successfully' });
});

// Get current user
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select('-passwordHash -refreshToken -resetPasswordToken');
  const organization = await Organization.findById(req.organizationId);

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt
    },
    organization: {
      id: organization._id,
      name: organization.name,
      slug: organization.slug,
      plan: organization.plan,
      logoUrl: organization.logoUrl,
      primaryColor: organization.primaryColor,
      subscription: organization.subscription,
      limits: organization.limits,
      usage: organization.usage
    }
  });
});
