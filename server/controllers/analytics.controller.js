import Lead from '../models/Lead.model.js';
import QueryLog from '../models/QueryLog.model.js';
import Document from '../models/Document.model.js';
import User from '../models/User.model.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  const filter = { organizationId: req.organizationId, isDeleted: false };
  if (Object.keys(dateFilter).length > 0) {
    filter.createdAt = dateFilter;
  }

  const [
    totalLeads,
    newLeads,
    wonLeads,
    lostLeads,
    totalQueries,
    totalDocuments,
    avgLeadScore
  ] = await Promise.all([
    Lead.countDocuments({ organizationId: req.organizationId, isDeleted: false }),
    Lead.countDocuments({ ...filter, status: 'new' }),
    Lead.countDocuments({ organizationId: req.organizationId, status: 'closed_won', isDeleted: false }),
    Lead.countDocuments({ organizationId: req.organizationId, status: 'closed_lost', isDeleted: false }),
    QueryLog.countDocuments(filter),
    Document.countDocuments({ organizationId: req.organizationId, isDeleted: false }),
    Lead.aggregate([
      { $match: { organizationId: req.organizationId, isDeleted: false } },
      { $group: { _id: null, avgScore: { $avg: '$score' } } }
    ])
  ]);

  const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

  res.json({
    totalLeads,
    newLeads,
    wonLeads,
    lostLeads,
    conversionRate: conversionRate.toFixed(2),
    totalQueries,
    totalDocuments,
    avgLeadScore: avgLeadScore[0]?.avgScore || 0
  });
});

export const getLeadAnalytics = asyncHandler(async (req, res) => {
  const leadsByStatus = await Lead.aggregate([
    { $match: { organizationId: req.organizationId, isDeleted: false } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const leadsBySource = await Lead.aggregate([
    { $match: { organizationId: req.organizationId, isDeleted: false } },
    { $group: { _id: '$source', count: { $sum: 1 } } }
  ]);

  const leadsByScore = await Lead.aggregate([
    { $match: { organizationId: req.organizationId, isDeleted: false } },
    {
      $bucket: {
        groupBy: '$score',
        boundaries: [0, 40, 70, 100],
        default: 'Other',
        output: { count: { $sum: 1 } }
      }
    }
  ]);

  res.json({
    byStatus: leadsByStatus,
    bySource: leadsBySource,
    byScore: leadsByScore
  });
});

export const getQueryAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const dateFilter = { organizationId: req.organizationId };
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
  }

  const queriesByDay = await QueryLog.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        avgLatency: { $avg: '$latencyMs' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const topQueries = await QueryLog.aggregate([
    { $match: dateFilter },
    { $group: { _id: '$query', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  res.json({
    queriesByDay,
    topQueries
  });
});

export const getAgentPerformance = asyncHandler(async (req, res) => {
  const agents = await User.find({
    organizationId: req.organizationId,
    role: 'SALES_AGENT',
    isActive: true,
    isDeleted: false
  });

  const performance = await Promise.all(
    agents.map(async (agent) => {
      const [leadsAssigned, leadsConverted, avgResponseTime] = await Promise.all([
        Lead.countDocuments({
          organizationId: req.organizationId,
          assignedAgentId: agent._id,
          isDeleted: false
        }),
        Lead.countDocuments({
          organizationId: req.organizationId,
          assignedAgentId: agent._id,
          status: 'closed_won',
          isDeleted: false
        }),
        Lead.aggregate([
          {
            $match: {
              organizationId: req.organizationId,
              assignedAgentId: agent._id,
              lastContactedAt: { $exists: true }
            }
          },
          {
            $project: {
              responseTime: {
                $subtract: ['$lastContactedAt', '$createdAt']
              }
            }
          },
          {
            $group: {
              _id: null,
              avgTime: { $avg: '$responseTime' }
            }
          }
        ])
      ]);

      return {
        agentId: agent._id,
        agentName: agent.name,
        leadsAssigned,
        leadsConverted,
        conversionRate: leadsAssigned > 0 ? (leadsConverted / leadsAssigned) * 100 : 0,
        avgResponseTimeHours: avgResponseTime[0]?.avgTime
          ? (avgResponseTime[0].avgTime / (1000 * 60 * 60)).toFixed(2)
          : 0
      };
    })
  );

  res.json({ performance });
});

export const getDocumentUsage = asyncHandler(async (req, res) => {
  const documentUsage = await QueryLog.aggregate([
    { $match: { organizationId: req.organizationId } },
    { $unwind: '$sources' },
    {
      $group: {
        _id: '$sources.documentId',
        queryCount: { $sum: 1 },
        fileName: { $first: '$sources.fileName' }
      }
    },
    { $sort: { queryCount: -1 } },
    { $limit: 10 }
  ]);

  res.json({ documentUsage });
});
