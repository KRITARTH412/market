import { createContext, useContext } from 'react';
import useAuthStore from '../store/authStore';

const PermissionContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
};

export const PermissionProvider = ({ children }) => {
  const { user } = useAuthStore();
  
  /**
   * Check if user has permission for a module action
   * @param {string} module - Module name (e.g., 'projects', 'documents')
   * @param {string} action - Action type (e.g., 'view', 'edit', 'delete')
   * @returns {boolean}
   */
  const hasModulePermission = (module, action = 'view') => {
    if (!user) return false;
    
    // Owner and Super Admin have all permissions
    if (user.role === 'ORG_OWNER' || user.role === 'SUPER_ADMIN') {
      return true;
    }
    
    // Check module permissions
    const modulePerms = user.modulePermissions?.[module];
    return modulePerms?.[action] || false;
  };
  
  /**
   * Check if user has access to a feature
   * @param {string} feature - Feature name (e.g., 'globalBot', 'aiChat')
   * @returns {boolean}
   */
  const hasFeaturePermission = (feature) => {
    if (!user) return false;
    
    // Owner and Super Admin have all features
    if (user.role === 'ORG_OWNER' || user.role === 'SUPER_ADMIN') {
      return true;
    }
    
    return user.featurePermissions?.[feature] || false;
  };
  
  /**
   * Check if user can manage permissions
   * @returns {boolean}
   */
  const canManagePermissions = () => {
    if (!user) return false;
    return user.role === 'ORG_OWNER' || user.role === 'ORG_ADMIN' || user.role === 'SUPER_ADMIN';
  };
  
  /**
   * Check if user can manage a specific user's permissions
   * @param {object} targetUser - The user whose permissions are being managed
   * @returns {boolean}
   */
  const canManageUserPermissions = (targetUser) => {
    if (!user || !targetUser) return false;
    
    // Owner can manage everyone
    if (user.role === 'ORG_OWNER' || user.role === 'SUPER_ADMIN') {
      return true;
    }
    
    // Admin can manage non-admin users
    if (user.role === 'ORG_ADMIN') {
      return targetUser.role !== 'ORG_OWNER' && 
             targetUser.role !== 'ORG_ADMIN' && 
             targetUser.role !== 'SUPER_ADMIN';
    }
    
    return false;
  };
  
  /**
   * Get all module permissions for current user
   * @returns {object}
   */
  const getModulePermissions = () => {
    if (!user) return {};
    
    // Owner and Super Admin have all permissions
    if (user.role === 'ORG_OWNER' || user.role === 'SUPER_ADMIN') {
      return {
        dashboard: { view: true, edit: true, delete: true },
        projects: { view: true, edit: true, delete: true },
        documents: { view: true, edit: true, delete: true },
        chat: { view: true, edit: true, delete: true },
        leads: { view: true, edit: true, delete: true },
        analytics: { view: true, edit: true, delete: true },
        team: { view: true, edit: true, delete: true },
        settings: { view: true, edit: true, delete: true },
        billing: { view: true, edit: true, delete: true }
      };
    }
    
    return user.modulePermissions || {};
  };
  
  /**
   * Get all feature permissions for current user
   * @returns {object}
   */
  const getFeaturePermissions = () => {
    if (!user) return {};
    
    // Owner and Super Admin have all features
    if (user.role === 'ORG_OWNER' || user.role === 'SUPER_ADMIN') {
      return {
        globalBot: true,
        aiChat: true,
        documentUpload: true,
        leadManagement: true,
        analytics: true,
        reporting: true,
        apiAccess: true
      };
    }
    
    return user.featurePermissions || {};
  };
  
  const value = {
    hasModulePermission,
    hasFeaturePermission,
    canManagePermissions,
    canManageUserPermissions,
    getModulePermissions,
    getFeaturePermissions,
    user
  };
  
  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};
