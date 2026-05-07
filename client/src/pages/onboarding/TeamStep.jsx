import { useState } from 'react';
import { Users, Mail, Plus, X } from 'lucide-react';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function TeamStep({ data, onNext, onBack }) {
  const [invites, setInvites] = useState(data.invites || []);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('SALES_AGENT');
  
  const handleAddInvite = () => {
    if (!email) return;
    
    setInvites([...invites, { email, role }]);
    setEmail('');
    setRole('SALES_AGENT');
  };
  
  const handleRemoveInvite = (index) => {
    setInvites(invites.filter((_, i) => i !== index));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onNext({ invites });
  };
  
  const handleSkipStep = () => {
    onNext({ invites: [] });
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <Users className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Invite Your Team
        </h2>
        <p className="text-gray-600">
          Collaborate better by inviting your team members
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Add Invite Form */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                icon={Mail}
              />
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="SALES_AGENT">Sales Agent</option>
              <option value="LEAD_MANAGER">Lead Manager</option>
              <option value="ORG_ADMIN">Admin</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <Button
              type="button"
              onClick={handleAddInvite}
              disabled={!email}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Invites List */}
        {invites.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">
              Pending Invites ({invites.length})
            </h3>
            {invites.map((invite, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{invite.email}</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {invite.role.replace('_', ' ')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveInvite(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {invites.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>No team members added yet</p>
            <p className="text-sm">You can always invite them later</p>
          </div>
        )}
        
        <div className="flex justify-between pt-6">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={handleSkipStep}>
              Skip for Now
            </Button>
            <Button type="submit">
              Continue
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
