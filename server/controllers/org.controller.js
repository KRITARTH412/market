import { validationResult } from 'express-validator';
import Organization from '../models/Organization.model.js';
import User from '../models/User.model.js';
import { sendEmail, emailTemplates } from '../utils/email.utils.js';
import { generateEmailVerificationToken } from '../utils/jwt.utils.js';
import { createAuditLog } from '../middleware/auditLog.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Get organization details
export const getOrganization = asyncHandler(async (req, res) => {
  const organization = await Organization.findById(req.organizationId);
  
  if (!organization) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  res.json({
    organization: {
      id: organization._id,
      name: organization.name,
      slug: organization.slug,
      plan: organization.plan,
      logoUrl: organization.logoUrl,
      primaryColor: organization.primaryColor,
      customDomain: organization.customDomain,
      apiKey: organization.apiKey,
      limits: organization.limits,
      usage: organization.usage,
      subscription: organization.subscription
    }
  });
});

// Update organization settings
export const updateOrganization = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, logoUrl, primaryColor, customDomain } = req.body;
  
  const organization = await Organization.findById(req.organizationId);
  
  if (!organization) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  // Update fields
  if (name) organization.name = name;
  if (logoUrl) organization.logoUrl = logoUrl;
  if (primaryColor) organization.primaryColor = primaryColor;
  if (customDomain !== undefined) organization.customDomain = customDomain;

  await organization.save();

  await createAuditLog('org.settings_update', req, { updates: req.body }, 'organization', organization._id);

  res.json({
    message: 'Organization updated successfully',
    organization
  });
});

// Get organization members
export const getMembers = asyncHandler(async (req, res) => {
  const members = await User.find({
    organizationId: req.organizationId,
    isDeleted: false
  }).select('-passwordHash -refreshToken -resetPasswordToken');

  res.json({
    members: members.map(member => ({
      id: member._id,
      name: member.name,
      email: member.email,
      role: member.role,
      isActive: member.isActive,
      lastLoginAt: member.lastLoginAt,
      createdAt: member.createdAt
    }))
  });
});

// Invite new member
export const inviteMember = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, name, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }

  // Create user with temporary password
  const tempPassword = Math.random().toString(36).slice(-12);
  
  const user = new User({
    organizationId: req.organizationId,
    name,
    email: email.toLowerCase(),
    passwordHash: tempPassword,
    role,
    isActive: true,
    invitedBy: req.userId
  });

  await user.save();

  // Generate invitation token
  const inviteToken = generateEmailVerificationToken(user._id);
  user.emailVerificationToken = inviteToken;
  await user.save();

  // Increment user count
  await req.organization.incrementUsage('userCount');

  // Send invitation email
  const organization = await Organization.findById(req.organizationId);
  const inviteLink = `${process.env.CLIENT_URL}/accept-invite/${inviteToken}`;
  const emailContent = emailTemplates.invitation(organization.name, req.user.name, inviteLink);
  await sendEmail(user.email, emailContent.subject, emailContent.html);

  await createAuditLog('user.invite', req, { email, role }, 'user', user._id);

  res.status(201).json({
    message: 'Invitation sent successfully',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// Update member role
export const updateMemberRole = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { memberId } = req.params;
  const { role } = req.body;

  const member = await User.findOne({
    _id: memberId,
    organizationId: req.organizationId,
    isDeleted: false
  });

  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  // Cannot change role of organization owner
  const organization = await Organization.findById(req.organizationId);
  if (member._id.equals(organization.ownerId)) {
    return res.status(403).json({ error: 'Cannot change role of organization owner' });
  }

  const oldRole = member.role;
  member.role = role;
  await member.save();

  await createAuditLog('user.role_change', req, { oldRole, newRole: role }, 'user', member._id);

  res.json({
    message: 'Member role updated successfully',
    member: {
      id: member._id,
      name: member.name,
      email: member.email,
      role: member.role
    }
  });
});

// Deactivate member
export const deactivateMember = asyncHandler(async (req, res) => {
  const { memberId } = req.params;

  const member = await User.findOne({
    _id: memberId,
    organizationId: req.organizationId,
    isDeleted: false
  });

  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  // Cannot deactivate organization owner
  const organization = await Organization.findById(req.organizationId);
  if (member._id.equals(organization.ownerId)) {
    return res.status(403).json({ error: 'Cannot deactivate organization owner' });
  }

  member.isActive = false;
  member.refreshToken = null; // Invalidate sessions
  await member.save();

  await createAuditLog('user.deactivate', req, {}, 'user', member._id);

  res.json({
    message: 'Member deactivated successfully'
  });
});

// Get usage statistics
export const getUsageStats = asyncHandler(async (req, res) => {
  const organization = await Organization.findById(req.organizationId);

  if (!organization) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  const usagePercentages = {
    users: (organization.usage.userCount / organization.limits.maxUsers) * 100,
    documents: (organization.usage.documentCount / organization.limits.maxDocuments) * 100,
    projects: (organization.usage.projectCount / organization.limits.maxProjects) * 100,
    queries: (organization.usage.monthlyQueryCount / organization.limits.monthlyQueryLimit) * 100,
    storage: (organization.usage.storageBytes / organization.limits.maxStorageBytes) * 100
  };

  res.json({
    usage: organization.usage,
    limits: organization.limits,
    percentages: usagePercentages,
    subscription: organization.subscription
  });
});
