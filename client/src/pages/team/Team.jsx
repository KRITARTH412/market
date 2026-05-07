import { useEffect, useState } from 'react';
import { UserPlus, Mail, Shield, Bot } from 'lucide-react';
import api from '../../lib/api';
import { grantGlobalBotAccess, revokeGlobalBotAccess } from '../../lib/chatDualModeApi';
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
      const response = await api.get('/org/members');
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
      await api.patch(`/org/members/${memberId}/role`, { role: newRole });
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
      await api.patch(`/org/members/${memberId}/deactivate`);
      setMembers(members.filter(m => m._id !== memberId));
      toast.success('Member removed successfully');
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const handleToggleGlobalBotAccess = async (memberId, hasAccess) => {
    try {
      if (hasAccess) {
        await revokeGlobalBotAccess(memberId);
        toast.success('Global bot access revoked');
      } else {
        await grantGlobalBotAccess(memberId);
        toast.success('Global bot access granted');
      }
      // Refresh members list
      fetchTeamMembers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update global bot access');
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
                <Table.Header>Global Bot</Table.Header>
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
                    <div className="flex items-center space-x-2">
                      {member.permissions?.includes('GLOBAL_BOT_ACCESS') || 
                       member.role === 'SUPER_ADMIN' || 
                       member.role === 'ORG_OWNER' ||
                       member.role === 'ORG_ADMIN' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Bot className="w-3 h-3 mr-1" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Disabled
                        </span>
                      )}
                    </div>
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
                            {/* Only show toggle for non-admin roles */}
                            {member.role !== 'ORG_ADMIN' && member.role !== 'ORG_OWNER' && member.role !== 'SUPER_ADMIN' && (
                              <button
                                onClick={() => handleToggleGlobalBotAccess(
                                  member._id,
                                  member.permissions?.includes('GLOBAL_BOT_ACCESS')
                                )}
                                className="text-sm text-blue-600 hover:text-blue-800"
                                title={member.permissions?.includes('GLOBAL_BOT_ACCESS') ? 'Revoke global bot access' : 'Grant global bot access'}
                              >
                                <Bot className="w-4 h-4" />
                              </button>
                            )}
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

      {/* Global Bot Access Info */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Bot className="w-5 h-5 mr-2" />
          Global Bot Access
        </h2>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            The Global Bot allows users to search and query across all projects in the organization. 
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-900 mb-2">Default Access:</h3>
            <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
              <li><strong>Super Admin</strong> - Always has access</li>
              <li><strong>Organization Owner</strong> - Always has access</li>
              <li><strong>Organization Admin</strong> - Always has access</li>
            </ul>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Grant access to other roles:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Click the <Bot className="w-3 h-3 inline" /> icon in the Actions column</li>
              <li>User will be able to access the organization-wide chat bot</li>
              <li>Click again to revoke access</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
}
