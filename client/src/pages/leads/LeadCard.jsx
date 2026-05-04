import { Mail, Phone, Building2, Calendar, TrendingUp } from 'lucide-react';
import { formatDate, getLeadScoreColor, getLeadScoreLabel } from '../../lib/utils';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import Badge from '../../components/Badge';

const LeadCard = ({ lead, onClick, onStatusChange }) => {
  return (
    <Card hover onClick={onClick} className="cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{lead.name}</h3>
          <StatusBadge status={lead.status} />
        </div>
        {lead.score !== undefined && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getLeadScoreColor(lead.score)}`}>
            <div className="flex items-center space-x-1">
              <TrendingUp className="w-4 h-4" />
              <span>{lead.score}</span>
            </div>
            <div className="text-xs">{getLeadScoreLabel(lead.score)}</div>
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {lead.email && (
          <div className="flex items-center text-sm text-gray-600">
            <Mail className="w-4 h-4 mr-2" />
            {lead.email}
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="w-4 h-4 mr-2" />
            {lead.phone}
          </div>
        )}
        {lead.projectId && (
          <div className="flex items-center text-sm text-gray-600">
            <Building2 className="w-4 h-4 mr-2" />
            {lead.projectId.name}
          </div>
        )}
      </div>

      {lead.requirements && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {lead.requirements}
        </p>
      )}

      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {lead.tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="default" size="sm">{tag}</Badge>
          ))}
          {lead.tags.length > 3 && (
            <Badge variant="default" size="sm">+{lead.tags.length - 3}</Badge>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center">
          <Calendar className="w-3 h-3 mr-1" />
          {formatDate(lead.createdAt)}
        </div>
        {lead.assignedTo && (
          <div className="flex items-center">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs mr-1">
              {lead.assignedTo.name?.charAt(0).toUpperCase()}
            </div>
            <span>{lead.assignedTo.name}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default LeadCard;
