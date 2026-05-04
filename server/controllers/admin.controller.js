import Organization from '../models/Organization.model.js';
import User from '../models/User.model.js';
import Lead from '../models/Lead.model.js';
import QueryLog from '../models/QueryLog.model.js';
import AuditLog from '../models/AuditLog.model.js';
import { generateAccessToken } from '../utils/jwt.utils.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const getAllOrganizations = asyncHandler(async (req, res) => {
  const { plan, status, search } = req.query;

  const filter = { isDeleted: false };
  if (plan) filter.plan = plan;
  if (status) filter['subscription.status'] = status;
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { slug: new RegExp(search, 'i') }
    ];
  }

  const organizations = await Organization.find(filter)
    .populate('ownerId', 'name email')
    .sort({ createdAt: -1 });

  res.json({ organizations });
});

export const getOrganizationDetails = asyncHandler(async (req, res) => {
  const organization = await Organization.findById(req.params.id)
    .populate('ownerId', 'name email');

  if (!organization) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  const [userCount, leadCount, documentCount, queryCount] = await Promise.all([
    User.countDocuments({ organizationId: organization._id, isDeleted: false }),
    Lead.countDocuments({ organizationId: organization._id, isDeleted: false }),
    Document.countDocuments({ organizationId: organization._id, isDeleted: false }),
    QueryLog.countDocuments({ organizationId: organization._id })
  ]);

  res.json({
    organization,
    stats: {
      userCount,
      leadCount,
      documentCount,
      queryCount
    }
  });
});

export const impersonateOrganization = asyncHandler(async (req, res) => {
  const organization = await Organization.findById(req.params.id);

  if (!organization) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  const owner = await User.findById(organization.ownerId);

  if (!owner) {
    return res.status(404).json({ error: 'Organization owner not found' });
  }

  // Generate access token for the owner
  const accessToken = generateAccessToken(owner._id, organization._id, owner.role);

  res.json({
    message: 'Impersonation token generated',
    accessToken,
    organization: {
      id: organization._id,
      name: organization.name,
      slug: organization.slug
    },
    user: {
      id: owner._id,
      name: owner.name,
      email: owner.email,
      role: owner.role
    }
  });
});

export const getPlatformStats = asyncHandler(async (req, res) => {
  const [
    totalOrganizations,
    activeOrganizations,
    totalUsers,
    totalLeads,
    totalQueries,
    organizationsByPlan
  ] = await Promise.all([
    Organization.countDocuments({ isDeleted: false }),
    Organization.countDocuments({ 'subscription.status': 'active', isDeleted: false }),
    User.countDocuments({ isDeleted: false }),
    Lead.countDocuments({ isDeleted: false }),
    QueryLog.countDocuments({}),
    Organization.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$plan', count: { $sum: 1 } } }
    ])
  ]);

  res.json({
    totalOrganizations,
    activeOrganizations,
    totalUsers,
    totalLeads,
    totalQueries,
    organizationsByPlan
  });
});

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { organizationId, userId, action, startDate, endDate, limit = 100 } = req.query;

  const filter = {};
  if (organizationId) filter.organizationId = organizationId;
  if (userId) filter.userId = userId;
  if (action) filter.action = action;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const logs = await AuditLog.find(filter)
    .populate('userId', 'name email')
    .populate('organizationId', 'name')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  res.json({ logs });
});

export const exportAuditLogs = asyncHandler(async (req, res) => {
  const { organizationId, startDate, endDate } = req.query;

  const filter = {};
  if (organizationId) filter.organizationId = organizationId;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const logs = await AuditLog.find(filter)
    .populate('userId', 'name email')
    .populate('organizationId', 'name')
    .sort({ createdAt: -1 });

  // Convert to CSV
  const csv = [
    'Timestamp,Organization,User,Action,Resource Type,Resource ID,Status,IP Address',
    ...logs.map(log => [
      log.createdAt.toISOString(),
      log.organizationId?.name || 'N/A',
      log.userId?.email || 'N/A',
      log.action,
      log.resourceType || 'N/A',
      log.resourceId || 'N/A',
      log.status,
      log.ipAddress || 'N/A'
    ].join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
  res.send(csv);
});
