import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function AssignAgentsModal({ isOpen, onClose, projectId, currentAgents = [], onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      // Set currently assigned agents
      const currentAgentIds = currentAgents.map(a => a._id || a);
      setSelectedAgents(currentAgentIds);
    }
  }, [isOpen]);

  const fetchMembers = async () => {
    try {
      const response = await api.get('/org/members');
      setMembers(response.data.members || []);
    } catch (error) {
      console.error('Failed to load members:', error);
      toast.error('Failed to load team members');
    }
  };

  const toggleAgent = (agentId) => {
    setSelectedAgents(prev => {
      const isSelected = prev.includes(agentId);
      if (isSelected) {
        // Remove from selection
        return prev.filter(id => id !== agentId);
      } else {
        // Add to selection
        return [...prev, agentId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post(`/projects/${projectId}/agents`, {
        agentIds: selectedAgents
      });
      
      toast.success('Agents assigned successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to assign agents:', error);
      toast.error(error.response?.data?.error || 'Failed to assign agents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Agents" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="max-h-96 overflow-y-auto space-y-2">
          {members.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No team members available</p>
          ) : (
            members.map((member) => {
              const isSelected = selectedAgents.includes(member._id);
              
              return (
                <div
                  key={member._id}
                  onClick={() => toggleAgent(member._id)}
                  className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleAgent(member._id);
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="ml-3 flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                      {member.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                      <p className="text-xs text-gray-400">{member.role}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Assign Agents ({selectedAgents.length})
          </Button>
        </div>
      </form>
    </Modal>
  );
}
