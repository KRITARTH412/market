import { useState } from 'react';
import { Check, X } from 'lucide-react';

const MODULES = [
  { id: 'dashboard', name: 'Dashboard', actions: ['view', 'edit'] },
  { id: 'projects', name: 'Projects', actions: ['view', 'edit', 'delete'] },
  { id: 'documents', name: 'Documents', actions: ['view', 'edit', 'delete'] },
  { id: 'chat', name: 'Chat', actions: ['view', 'edit'] },
  { id: 'leads', name: 'Leads', actions: ['view', 'edit', 'delete'] },
  { id: 'analytics', name: 'Analytics', actions: ['view', 'edit'] },
  { id: 'team', name: 'Team', actions: ['view', 'edit', 'delete'] },
  { id: 'settings', name: 'Settings', actions: ['view', 'edit'] },
  { id: 'billing', name: 'Billing', actions: ['view', 'edit'] }
];

const FEATURES = [
  { id: 'globalBot', name: 'Global Bot' },
  { id: 'aiChat', name: 'AI Chat' },
  { id: 'documentUpload', name: 'Document Upload' },
  { id: 'leadManagement', name: 'Lead Management' },
  { id: 'analytics', name: 'Analytics' },
  { id: 'reporting', name: 'Reporting' },
  { id: 'apiAccess', name: 'API Access' }
];

export default function PermissionMatrix({ 
  user, 
  permissions, 
  onChange, 
  readOnly = false 
}) {
  const [activeTab, setActiveTab] = useState('modules');
  
  const handleModuleToggle = (module, action) => {
    if (readOnly) return;
    
    const newPermissions = { ...permissions };
    if (!newPermissions.modulePermissions) {
      newPermissions.modulePermissions = {};
    }
    if (!newPermissions.modulePermissions[module]) {
      newPermissions.modulePermissions[module] = { view: false, edit: false, delete: false };
    }
    
    newPermissions.modulePermissions[module][action] = !newPermissions.modulePermissions[module][action];
    onChange(newPermissions);
  };
  
  const handleFeatureToggle = (feature) => {
    if (readOnly) return;
    
    const newPermissions = { ...permissions };
    if (!newPermissions.featurePermissions) {
      newPermissions.featurePermissions = {};
    }
    
    newPermissions.featurePermissions[feature] = !newPermissions.featurePermissions[feature];
    onChange(newPermissions);
  };
  
  const isModuleActionEnabled = (module, action) => {
    return permissions?.modulePermissions?.[module]?.[action] || false;
  };
  
  const isFeatureEnabled = (feature) => {
    return permissions?.featurePermissions?.[feature] || false;
  };
  
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Permissions for {user?.name}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Role: <span className="font-medium">{user?.role}</span>
        </p>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex px-6">
          <button
            onClick={() => setActiveTab('modules')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'modules'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Module Permissions
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'features'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Feature Access
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {activeTab === 'modules' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Module
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    View
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Edit
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delete
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {MODULES.map((module) => (
                  <tr key={module.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {module.name}
                    </td>
                    {['view', 'edit', 'delete'].map((action) => (
                      <td key={action} className="px-4 py-3 text-center">
                        {module.actions.includes(action) ? (
                          <button
                            onClick={() => handleModuleToggle(module.id, action)}
                            disabled={readOnly}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded transition-colors ${
                              isModuleActionEnabled(module.id, action)
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            } ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {isModuleActionEnabled(module.id, action) ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <X className="w-5 h-5" />
                            )}
                          </button>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {activeTab === 'features' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-900">
                  {feature.name}
                </span>
                <button
                  onClick={() => handleFeatureToggle(feature.id)}
                  disabled={readOnly}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isFeatureEnabled(feature.id)
                      ? 'bg-blue-600'
                      : 'bg-gray-200'
                  } ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isFeatureEnabled(feature.id)
                        ? 'translate-x-6'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {readOnly && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            You don't have permission to modify these settings
          </p>
        </div>
      )}
    </div>
  );
}
