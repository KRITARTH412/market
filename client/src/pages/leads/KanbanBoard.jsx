import { Mail, Phone, TrendingUp } from 'lucide-react';
import { getLeadScoreColor, getLeadScoreLabel } from '../../lib/utils';
import Card from '../../components/Card';

const KanbanBoard = ({ leads, onStatusChange, onLeadClick }) => {
  const columns = [
    { id: 'new', label: 'New', color: 'bg-blue-100' },
    { id: 'contacted', label: 'Contacted', color: 'bg-purple-100' },
    { id: 'qualified', label: 'Qualified', color: 'bg-green-100' },
    { id: 'proposal', label: 'Proposal', color: 'bg-yellow-100' },
    { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-100' },
    { id: 'won', label: 'Won', color: 'bg-green-200' },
    { id: 'lost', label: 'Lost', color: 'bg-red-100' },
  ];

  const getLeadsByStatus = (status) => {
    return leads.filter(lead => lead.status === status);
  };

  const handleDragStart = (e, lead) => {
    e.dataTransfer.setData('leadId', lead._id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    onStatusChange(leadId, status);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnLeads = getLeadsByStatus(column.id);
        
        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-80"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className={`${column.color} rounded-lg p-3 mb-3`}>
              <h3 className="font-semibold text-gray-900 flex items-center justify-between">
                {column.label}
                <span className="text-sm bg-white rounded-full px-2 py-0.5">
                  {columnLeads.length}
                </span>
              </h3>
            </div>

            <div className="space-y-3">
              {columnLeads.map((lead) => (
                <div
                  key={lead._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead)}
                  onClick={() => onLeadClick(lead)}
                  className="cursor-move"
                >
                  <Card hover className="cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{lead.name}</h4>
                      {lead.score !== undefined && (
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getLeadScoreColor(lead.score)}`}>
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>{lead.score}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      {lead.email && (
                        <div className="flex items-center">
                          <Mail className="w-3 h-3 mr-2" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center">
                          <Phone className="w-3 h-3 mr-2" />
                          {lead.phone}
                        </div>
                      )}
                    </div>

                    {lead.projectId && (
                      <div className="mt-2 text-xs text-gray-500">
                        {lead.projectId.name}
                      </div>
                    )}
                  </Card>
                </div>
              ))}

              {columnLeads.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No leads
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
