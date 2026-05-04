import { useState } from 'react';
import { User, Building2, Code, Key } from 'lucide-react';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import useAuthStore from '../../store/authStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, organization } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [orgData, setOrgData] = useState({
    name: organization?.name || '',
    industry: organization?.industry || '',
    website: organization?.website || '',
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.patch('/auth/profile', profileData);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleOrgUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.patch('/organizations/profile', orgData);
      toast.success('Organization updated successfully');
    } catch (error) {
      toast.error('Failed to update organization');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'widget', label: 'Widget', icon: Code },
    { id: 'api', label: 'API Keys', icon: Key },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </Card>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Settings</h2>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <Input
                  label="Name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  required
                />
                <Input
                  label="Phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                />
                <Button type="submit" loading={loading}>
                  Save Changes
                </Button>
              </form>

              <hr className="my-6" />

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <Input
                  label="Current Password"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                />
                <Input
                  label="New Password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                />
                <Button type="submit" loading={loading}>
                  Update Password
                </Button>
              </form>
            </Card>
          )}

          {activeTab === 'organization' && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Organization Settings</h2>
              <form onSubmit={handleOrgUpdate} className="space-y-4">
                <Input
                  label="Organization Name"
                  value={orgData.name}
                  onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                  required
                />
                <Input
                  label="Industry"
                  value={orgData.industry}
                  onChange={(e) => setOrgData({ ...orgData, industry: e.target.value })}
                />
                <Input
                  label="Website"
                  value={orgData.website}
                  onChange={(e) => setOrgData({ ...orgData, website: e.target.value })}
                />
                <Button type="submit" loading={loading}>
                  Save Changes
                </Button>
              </form>
            </Card>
          )}

          {activeTab === 'widget' && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat Widget Configuration</h2>
              <p className="text-gray-600 mb-6">
                Embed the AI chat widget on your website to capture leads automatically.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Widget Code</h3>
                <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
{`<script src="https://your-domain.com/widget.js"></script>
<script>
  PropMindWidget.init({
    organizationId: '${organization?._id}',
    projectId: 'YOUR_PROJECT_ID',
    position: 'bottom-right',
    primaryColor: '#3B82F6'
  });
</script>`}
                </pre>
              </div>

              <Button onClick={() => toast.info('Widget customization coming soon!')}>
                Customize Widget
              </Button>
            </Card>
          )}

          {activeTab === 'api' && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">API Keys</h2>
              <p className="text-gray-600 mb-6">
                Manage API keys for integrating PropMind with your applications.
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  Keep your API keys secure. Do not share them publicly or commit them to version control.
                </p>
              </div>

              <Button onClick={() => toast.info('API key management coming soon!')}>
                Generate API Key
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
