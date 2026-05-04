import { useEffect, useState } from 'react';
import { UserPlus, Mail, Shield } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Table from '../../components/Table';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import Avatar from '../../components/Avatar';
import useAuthStore from '../../store/authStore';

export default function Team() {
  const { user } = useAuthStore();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get('/organizations/members');
      setMembers(response.data.members);
    } catch (error) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = () => {
    toast.info('Invite feature coming soon!');
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await api.patch(`/organizations/members/${memberId}`, { role: newRole });
      setMembers(members.map(m => 
        m._id === memberId ? { ...m, role: newRole } : m
      ));
      toast.success('Role updated successfully');
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleRemove = async (memberId) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await api.delete(`/organizations/members/${memberId}`);
      setMembers(members.filter(m => m._id !== memberId));
      toast.success('Member removed successfully');
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-600">Manage your organization members</p>
        </div>
        {isOwnerOrAdmin && (
          <Button onClick={handleInvite} icon={<UserPlus className="w-5 h-5" />}>
            Invite Member
          </Button>
        )}
      </div>

      {/* Team Members */}
      {members.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="w-12 h-12" />}
          title="No team members"
          description="Invite team members to collaborate on projects"
          action={handleInvite}
          actionLabel="Invite Member"
        />
      ) : (
        <Card padding={false}>
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.Header>Member</Table.Header>
                <Table.Header>Email</Table.Header>
                <Table.Header>Role</Table.Header>
                <Table.Header>Status</Table.Header>
                <Table.Header>Joined</Table.Header>
                {isOwnerOrAdmin && <Table.Header>Actions</Table.Header>}
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {members.map((member) => (
                <Table.Row key={member._id}>
                  <Table.Cell>
                    <div className="flex items-center space-x-3">
                      <Avatar name={member.name} size="sm" />
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{member.email}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge status={member.role} />
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge status={member.status || 'active'} />
                  </Table.Cell>
                  <Table.Cell>
                    {new Date(member.createdAt).toLocaleDateString()}
                  </Table.Cell>
                  {isOwnerOrAdmin && (
                    <Table.Cell>
                      <div className="flex items-center space-x-2">
                        {member.role !== 'owner' && (
                          <>
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member._id, e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="admin">Admin</option>
                              <option value="agent">Agent</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <button
                              onClick={() => handleRemove(member._id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </Table.Cell>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>
      )}

      {/* Role Descriptions */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Role Permissions
        </h2>
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-gray-900">Owner</h3>
            <p className="text-sm text-gray-600">Full access to all features including billing and organization settings</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Admin</h3>
            <p className="text-sm text-gray-600">Can manage projects, leads, documents, and team members</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Agent</h3>
            <p className="text-sm text-gray-600">Can manage assigned projects and leads, chat with customers</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Viewer</h3>
            <p className="text-sm text-gray-600">Read-only access to projects and analytics</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
