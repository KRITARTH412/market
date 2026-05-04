import { useEffect, useState } from 'react';
import { Users, Building2, FileText, TrendingUp, MessageSquare, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { formatNumber, formatCurrency } from '../../lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Leads',
      value: stats?.totalLeads || 0,
      icon: Users,
      color: 'bg-blue-500',
      link: '/leads',
    },
    {
      name: 'Active Projects',
      value: stats?.totalProjects || 0,
      icon: Building2,
      color: 'bg-green-500',
      link: '/projects',
    },
    {
      name: 'Documents',
      value: stats?.totalDocuments || 0,
      icon: FileText,
      color: 'bg-purple-500',
      link: '/documents',
    },
    {
      name: 'AI Queries',
      value: formatNumber(stats?.totalQueries || 0),
      icon: MessageSquare,
      color: 'bg-orange-500',
      link: '/chat',
    },
    {
      name: 'Conversion Rate',
      value: `${stats?.conversionRate || 0}%`,
      icon: TrendingUp,
      color: 'bg-pink-500',
      link: '/analytics',
    },
    {
      name: 'Avg Lead Score',
      value: Math.round(stats?.avgLeadScore || 0),
      icon: DollarSign,
      color: 'bg-indigo-500',
      link: '/leads',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.link}
            className="card hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Leads */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">New Leads</h2>
            <Link to="/leads" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.newLeads > 0 ? (
              <p className="text-gray-600">You have {stats.newLeads} new leads</p>
            ) : (
              <p className="text-gray-500">No new leads yet</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/projects"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center"
            >
              <Building2 className="w-6 h-6 mx-auto mb-2 text-primary-600" />
              <span className="text-sm font-medium text-gray-900">New Project</span>
            </Link>
            <Link
              to="/documents"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center"
            >
              <FileText className="w-6 h-6 mx-auto mb-2 text-primary-600" />
              <span className="text-sm font-medium text-gray-900">Upload Doc</span>
            </Link>
            <Link
              to="/chat"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center"
            >
              <MessageSquare className="w-6 h-6 mx-auto mb-2 text-primary-600" />
              <span className="text-sm font-medium text-gray-900">AI Chat</span>
            </Link>
            <Link
              to="/leads"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center"
            >
              <Users className="w-6 h-6 mx-auto mb-2 text-primary-600" />
              <span className="text-sm font-medium text-gray-900">Add Lead</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
