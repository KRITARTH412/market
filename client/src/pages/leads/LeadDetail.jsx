import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Building2, 
  Edit, 
  Trash2,
  MessageSquare,
  TrendingUp,
  Calendar,
  User
} from 'lucide-react';
import api from '../../lib/api';
import { formatDate, formatCurrency, getLeadScoreColor, getLeadScoreLabel } from '../../lib/utils';
import toast from 'react-hot-toast';
import Button from '../../components/Button';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import Badge from '../../components/Badge';
import ConfirmDialog from '../../components/ConfirmDialog';
import Select from '../../components/Select';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchLead();
  }, [id]);

  const fetchLead = async () => {
    try {
      const response = await api.get(`/leads/${id}`);
      setLead(response.data.lead);
    } catch (error) {
      toast.error('Failed to load lead');
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/leads/${id}`);
      toast.success('Lead deleted successfully');
      navigate('/leads');
    } catch (error) {
      toast.error('Failed to delete lead');
      setDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/leads/${id}`, { status: newStatus });
      setLead({ ...lead, status: newStatus });
      toast.success('Status updated successfully');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/leads')}
            icon={<ArrowLeft className="w-5 h-5" />}
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
            <p className="text-gray-600">Lead Details</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" icon={<Edit className="w-5 h-5" />}>
            Edit
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowDeleteDialog(true)}
            icon={<Trash2 className="w-5 h-5" />}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                <Select
                  value={lead.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  options={[
                    { value: 'new', label: 'New' },
                    { value: 'contacted', label: 'Contacted' },
                    { value: 'qualified', label: 'Qualified' },
                    { value: 'proposal', label: 'Proposal' },
                    { value: 'negotiation', label: 'Negotiation' },
                    { value: 'won', label: 'Won' },
                    { value: 'lost', label: 'Lost' },
                  ]}
                  className="w-48"
                />
              </div>
              
              {lead.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{lead.email}</span>
                </div>
              )}
              
              {lead.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{lead.phone}</span>
                </div>
              )}
              
              {lead.projectId && (
                <div className="flex items-center space-x-3">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{lead.projectId.name}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900">Created {formatDate(lead.createdAt)}</span>
              </div>
            </div>
          </Card>

          {/* Requirements */}
          {lead.requirements && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h2>
              <p className="text-gray-700">{lead.requirements}</p>
            </Card>
          )}

          {/* Budget */}
          {lead.budget && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget</h2>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(lead.budget)}</p>
            </Card>
          )}

          {/* Activity Timeline */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h2>
            <div className="space-y-4">
              {lead.interactions?.map((interaction, index) => (
                <div key={index} className="flex items-start space-x-3 pb-4 border-b last:border-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{interaction.type}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(interaction.date)}</p>
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 text-center py-8">No activity yet</p>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Lead Score */}
          {lead.score !== undefined && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Lead Score
              </h2>
              <div className={`text-center p-6 rounded-lg ${getLeadScoreColor(lead.score)}`}>
                <p className="text-4xl font-bold mb-2">{lead.score}</p>
                <p className="text-lg font-medium">{getLeadScoreLabel(lead.score)}</p>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Based on engagement, budget, and requirements match
              </p>
            </Card>
          )}

          {/* Assigned To */}
          {lead.assignedTo && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Assigned To
              </h2>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-lg">
                  {lead.assignedTo.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{lead.assignedTo.name}</p>
                  <p className="text-sm text-gray-500">{lead.assignedTo.email}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {lead.tags.map((tag, index) => (
                  <Badge key={index} variant="primary">{tag}</Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-2">
              <Button variant="outline" className="w-full" icon={<MessageSquare className="w-5 h-5" />}>
                View Chat History
              </Button>
              <Button variant="outline" className="w-full" icon={<Mail className="w-5 h-5" />}>
                Send Email
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Lead"
        message={`Are you sure you want to delete "${lead.name}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
}
