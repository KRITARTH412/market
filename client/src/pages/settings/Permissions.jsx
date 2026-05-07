import { useState, useEffect } from 'react';
import { Shield, Users, RefreshCw, Save, X } from 'lucide-react';
import { api } from '../../lib/api';
import PermissionMatrix from '../../components/PermissionMatrix';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Alert from '../../components/Alert';
import { usePermissions } from '../../contexts/PermissionContext';

export default function Permissions() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [alert, setAlert] = useState(null);
  
  const { canManagePermissions, canManageUserPermissions } = usePermissions();
  
  useEffect(() => {
    fetchTeamMembers();
  }, []);
  
  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/org/members');
      // Map 'id' to '_id' for consistency
      const members = (response.data.members || []).map(member => ({
        ...member,
        _id: member.id || member._id
      }));
      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load team members'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleUserSelect = async (user) => {
    if (!canManageUserPermissions(user)) {
      setAlert({
        type: 'error',
        message: 'You do not have permission to manage this user\'s permissions'
      });
      return;
    }
    
    try {
      const response = await api.get(`/permissions/users/${user._id}`);
      setSelectedUser(user);
      setPermissions({
        modulePermissions: response.data.modulePermissions || {},
        featurePermissions: response.data.featurePermissions || {}
      });
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load user permissions'
      });
    }
  };
  
  const handleSavePermissions = async () => {
    if (!selectedUser || !permissions) return;
    
    try {
      setSaving(true);
      await api.put(`/permissions/users/${selectedUser._id}`, permissions);
      
      setAlert({
        type: 'success',
        message: 'Permissions updated successfully'
      });
      
      setShowModal(false);
      setSelectedUser(null);
      setPermissions(null);
      
      // Refresh team members to get updated permissions
      fetchTeamMembers();
    } catch (error) {
      console.error('Error saving permissions:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Failed to save permissions'
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleResetToDefaults = async () => {
    if (!selectedUser) return;
    
    if (!confirm('Are you sure you want to reset permissions to role defaults?')) {
      return;
    }
    
    try {
      setSaving(true);
      const response = await api.post(`/permissions/users/${selectedUser._id}/reset`);
      
      setPermissions({
        modulePermissions: response.data.modulePermissions || {},
        featurePermissions: response.data.featurePermissions || {}
      });
      
      setAlert({
        type: 'success',
        message: 'Permissions reset to defaults'
      });
    } catch (error) {
      console.error('Error resetting permissions:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Failed to reset permissions'
      });
    } finally {
      setSaving(false);
    }
  };
  
  const getRoleBadgeColor = (role) => {
    const colors = {
      ORG_OWNER: 'bg-purple-100 text-purple-800',
      ORG_ADMIN: 'bg-blue-100 text-blue-800',
      SALES_AGENT: 'bg-green-100 text-green-800',
      LEAD_MANAGER: 'bg-yellow-100 text-yellow-800',
      VIEWER: 'bg-gray-100 text-gray-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };
  
  if (!canManagePermissions()) {
    return (
      <div className="p-6">
        <Alert
          type="error"
          message="You do not have permission to manage permissions"
        />
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Permission Management</h1>
        </div>
        <p className="text-gray-600">
          Manage module and feature permissions for your team members
        </p>
      </div>
      
      {/* Alert */}
      {alert && (
        <div className="mb-6">
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </div>
      )}
      
      {/* Team Members List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {teamMembers.map((member) => (
            <div
              key={member._id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {member.name}
                    </h3>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                    {member.role.replace('_', ' ')}
                  </span>
                  
                  {canManageUserPermissions(member) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUserSelect(member)}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Manage Permissions
                    </Button>
                  ) : (
                    <span className="text-sm text-gray-400">
                      Cannot manage
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {teamMembers.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No team members found</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Permission Modal */}
      {showModal && selectedUser && permissions && (
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedUser(null);
            setPermissions(null);
          }}
          title="Manage Permissions"
          size="xl"
        >
          <div className="space-y-6">
            <PermissionMatrix
              user={selectedUser}
              permissions={permissions}
              onChange={setPermissions}
              readOnly={false}
            />
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={handleResetToDefaults}
                disabled={saving}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedUser(null);
                    setPermissions(null);
                  }}
                  disabled={saving}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePermissions}
                  disabled={saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
