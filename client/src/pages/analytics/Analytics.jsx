import { useEffect, useState } from 'react';
import { TrendingUp, Users, FileText, MessageSquare, DollarSign, Activity } from 'lucide-react';
import api from '../../lib/api';
import { formatNumber, formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';
import Card from '../../components/Card';

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/analytics/overview');
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Total Leads',
      value: stats?.totalLeads || 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Active Projects',
      value: stats?.activeProjects || 0,
      icon: Activity,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      label: 'Documents',
      value: stats?.totalDocuments || 0,
      icon: FileText,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      label: 'Chat Sessions',
      value: stats?.totalChats || 0,
      icon: MessageSquare,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
    },
    {
      label: 'Conversion Rate',
      value: `${stats?.conversionRate || 0}%`,
      icon: TrendingUp,
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
    {
      label: 'Revenue Pipeline',
      value: formatCurrency(stats?.revenuePipeline || 0),
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600">Track your business performance</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              </div>
              <div className={`w-12 h-12 ${metric.bg} rounded-lg flex items-center justify-center`}>
                <metric.icon className={`w-6 h-6 ${metric.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Lead Funnel */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Funnel</h2>
        <div className="space-y-3">
          {stats?.leadFunnel?.map((stage, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{stage.status}</span>
                <span className="text-sm text-gray-600">{stage.count} leads</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(stage.count / (stats?.totalLeads || 1)) * 100}%` }}
                />
              </div>
            </div>
          )) || (
            <p className="text-gray-500 text-center py-8">No funnel data available</p>
          )}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {stats?.recentActivity?.map((activity, index) => (
            <div key={index} className="flex items-start space-x-3 pb-4 border-b last:border-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
              </div>
            </div>
          )) || (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          )}
        </div>
      </Card>

      {/* Top Projects */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Projects</h2>
        <div className="space-y-3">
          {stats?.topProjects?.map((project, index) => (
            <div key={index} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{project.name}</p>
                <p className="text-sm text-gray-500">{project.leadCount} leads</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{formatCurrency(project.revenue)}</p>
                <p className="text-sm text-gray-500">{project.conversionRate}% conversion</p>
              </div>
            </div>
          )) || (
            <p className="text-gray-500 text-center py-8">No project data available</p>
          )}
        </div>
      </Card>
    </div>
  );
}
