import { useEffect, useState } from 'react';
import { Plus, Users, LayoutGrid, List, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import Button from '../../components/Button';
import SearchBar from '../../components/SearchBar';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import Select from '../../components/Select';
import LeadCard from './LeadCard';
import KanbanBoard from './KanbanBoard';
import CreateLead from './CreateLead';

export default function Leads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'kanban'
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchLeads();
    fetchProjects();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await api.get('/leads');
      setLeads(response.data.leads);
    } catch (error) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data.projects);
    } catch (error) {
      console.error('Failed to load projects');
    }
  };

  const handleLeadCreated = (newLead) => {
    setLeads([newLead, ...leads]);
    setShowCreateModal(false);
    toast.success('Lead created successfully');
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await api.patch(`/leads/${leadId}`, { status: newStatus });
      setLeads(leads.map(lead => 
        lead._id === leadId ? { ...lead, status: newStatus } : lead
      ));
      toast.success('Lead status updated');
    } catch (error) {
      toast.error('Failed to update lead status');
    }
  };

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email?.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone?.includes(search);
    const matchesProject = selectedProject === 'all' || lead.projectId?._id === selectedProject;
    const matchesStatus = selectedStatus === 'all' || lead.status === selectedStatus;
    return matchesSearch && matchesProject && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">Manage your sales pipeline</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} icon={<Plus className="w-5 h-5" />}>
          New Lead
        </Button>
      </div>

      {/* Filters & View Toggle */}
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <SearchBar
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Search leads..."
            />
            
            <Select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              options={[
                { value: 'all', label: 'All Projects' },
                ...projects.map(p => ({ value: p._id, label: p.name })),
              ]}
            />
            
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'new', label: 'New' },
                { value: 'contacted', label: 'Contacted' },
                { value: 'qualified', label: 'Qualified' },
                { value: 'proposal', label: 'Proposal' },
                { value: 'negotiation', label: 'Negotiation' },
                { value: 'won', label: 'Won' },
                { value: 'lost', label: 'Lost' },
              ]}
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-white shadow' : ''}`}
              title="Kanban View"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </Card>

      {/* Leads Display */}
      {filteredLeads.length === 0 ? (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title="No leads found"
          description="Start capturing leads from your AI chat widget or create them manually"
          action={() => setShowCreateModal(true)}
          actionLabel="Create Lead"
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => (
            <LeadCard
              key={lead._id}
              lead={lead}
              onClick={() => navigate(`/leads/${lead._id}`)}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      ) : (
        <KanbanBoard
          leads={filteredLeads}
          onStatusChange={handleStatusChange}
          onLeadClick={(lead) => navigate(`/leads/${lead._id}`)}
        />
      )}

      {/* Create Modal */}
      <CreateLead
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleLeadCreated}
        projects={projects}
      />
    </div>
  );
}
