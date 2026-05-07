import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Building2, 
  Users, 
  Edit, 
  Trash2,
  FileText,
  MessageSquare 
} from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import Button from '../../components/Button';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import Badge from '../../components/Badge';
import ConfirmDialog from '../../components/ConfirmDialog';
import AssignAgentsModal from '../../components/AssignAgentsModal';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignAgentsModal, setShowAssignAgentsModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`);
      setProject(response.data.project);
    } catch (error) {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Project deleted successfully');
      navigate('/projects');
    } catch (error) {
      toast.error('Failed to delete project');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/projects')}
            icon={<ArrowLeft className="w-5 h-5" />}
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600">Project Details</p>
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

      {/* Cover Image */}
      {project.coverImage && (
        <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
          <img
            src={project.coverImage}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                <StatusBadge status={project.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Created</span>
                <span className="text-gray-900">{formatDate(project.createdAt)}</span>
              </div>
              {project.description && (
                <div>
                  <span className="text-gray-600 block mb-2">Description</span>
                  <p className="text-gray-900">{project.description}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Location */}
          {project.location && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Location
              </h2>
              <div className="space-y-2">
                {project.location.address && (
                  <p className="text-gray-900">{project.location.address}</p>
                )}
                <p className="text-gray-900">
                  {project.location.city}, {project.location.state}
                  {project.location.pincode && ` - ${project.location.pincode}`}
                </p>
              </div>
            </Card>
          )}

          {/* Specifications */}
          {project.specifications && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Specifications
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {project.specifications.bhkTypes?.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600 block mb-2">BHK Types</span>
                    <div className="flex flex-wrap gap-2">
                      {project.specifications.bhkTypes.map((type, index) => (
                        <Badge key={index} variant="primary">{type}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {project.specifications.priceRange && (
                  <div>
                    <span className="text-sm text-gray-600 block mb-2">Price Range</span>
                    <p className="text-gray-900 font-medium">
                      {formatCurrency(project.specifications.priceRange.min)} - {formatCurrency(project.specifications.priceRange.max)}
                    </p>
                  </div>
                )}
                {project.specifications.totalUnits && (
                  <div>
                    <span className="text-sm text-gray-600 block mb-2">Total Units</span>
                    <p className="text-gray-900 font-medium">{project.specifications.totalUnits}</p>
                  </div>
                )}
                {project.specifications.availableUnits !== undefined && (
                  <div>
                    <span className="text-sm text-gray-600 block mb-2">Available Units</span>
                    <p className="text-gray-900 font-medium">{project.specifications.availableUnits}</p>
                  </div>
                )}
              </div>
              {project.specifications.amenities?.length > 0 && (
                <div className="mt-4">
                  <span className="text-sm text-gray-600 block mb-2">Amenities</span>
                  <div className="flex flex-wrap gap-2">
                    {project.specifications.amenities.map((amenity, index) => (
                      <Badge key={index} variant="success">{amenity}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Documents */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Documents
              </h2>
              <Button size="sm">Upload</Button>
            </div>
            <p className="text-gray-500 text-center py-8">No documents uploaded yet</p>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assigned Agents */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Assigned Agents
            </h2>
            {project.assignedAgents?.length > 0 ? (
              <div className="space-y-3">
                {project.assignedAgents.map((agent) => (
                  <div key={agent._id} className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                      {agent.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                      <p className="text-xs text-gray-500">{agent.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No agents assigned</p>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4"
              onClick={() => setShowAssignAgentsModal(true)}
            >
              Assign Agents
            </Button>
          </Card>

          {/* Quick Stats */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Leads</span>
                <span className="text-lg font-semibold text-gray-900">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Chats</span>
                <span className="text-lg font-semibold text-gray-900">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Documents</span>
                <span className="text-lg font-semibold text-gray-900">0</span>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-2">
              <Button variant="outline" className="w-full" icon={<MessageSquare className="w-5 h-5" />}>
                View Chats
              </Button>
              <Button variant="outline" className="w-full" icon={<FileText className="w-5 h-5" />}>
                View Documents
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
        title="Delete Project"
        message={`Are you sure you want to delete "${project.name}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
      />

      {/* Assign Agents Modal */}
      <AssignAgentsModal
        isOpen={showAssignAgentsModal}
        onClose={() => setShowAssignAgentsModal(false)}
        projectId={id}
        currentAgents={project.assignedAgents || []}
        onSuccess={fetchProject}
      />
    </div>
  );
}
