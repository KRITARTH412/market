import Badge from './Badge';

const StatusBadge = ({ status }) => {
  const statusConfig = {
    // Lead statuses
    new: { variant: 'primary', label: 'New' },
    contacted: { variant: 'default', label: 'Contacted' },
    qualified: { variant: 'success', label: 'Qualified' },
    proposal: { variant: 'warning', label: 'Proposal' },
    negotiation: { variant: 'warning', label: 'Negotiation' },
    won: { variant: 'success', label: 'Won' },
    lost: { variant: 'danger', label: 'Lost' },
    
    // Document statuses
    pending: { variant: 'warning', label: 'Pending' },
    processing: { variant: 'primary', label: 'Processing' },
    completed: { variant: 'success', label: 'Completed' },
    failed: { variant: 'danger', label: 'Failed' },
    
    // Project statuses
    active: { variant: 'success', label: 'Active' },
    inactive: { variant: 'default', label: 'Inactive' },
    archived: { variant: 'default', label: 'Archived' },
    
    // User roles
    owner: { variant: 'purple', label: 'Owner' },
    admin: { variant: 'primary', label: 'Admin' },
    agent: { variant: 'default', label: 'Agent' },
    viewer: { variant: 'default', label: 'Viewer' },
  };
  
  const config = statusConfig[status?.toLowerCase()] || { variant: 'default', label: status };
  
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default StatusBadge;
