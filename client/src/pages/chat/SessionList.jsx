import { MessageSquare, Trash2 } from 'lucide-react';
import { formatRelativeTime } from '../../lib/utils';
import { cn } from '../../lib/utils';

const SessionList = ({ sessions, currentSession, onSelectSession, onDeleteSession }) => {
  const handleDelete = (e, sessionId) => {
    e.stopPropagation(); // Prevent session selection when clicking delete
    if (window.confirm('Are you sure you want to delete this chat session?')) {
      onDeleteSession(sessionId);
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No chat sessions yet</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-2 pr-2" style={{ maxHeight: 'calc(100vh - 20rem)' }}>
      {sessions.map((session) => (
        <button
          key={session.id || session._id}
          onClick={() => onSelectSession(session)}
          className={cn(
            'w-full text-left p-3 rounded-lg transition-colors relative group',
            currentSession?.id === session.id || currentSession?._id === session._id
              ? 'bg-blue-50 border-2 border-blue-500'
              : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
          )}
        >
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-medium text-gray-900 text-sm truncate flex-1 pr-8">
              {session.projectId?.name || 'Untitled Chat'}
            </h3>
            <button
              onClick={(e) => handleDelete(e, session.id || session._id)}
              className="absolute right-2 top-2 p-1 rounded hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete chat"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
            {session.leadId && (
              <span className="text-xs text-blue-600 ml-2">Lead</span>
            )}
          </div>
          {session.lastMessage && (
            <p className="text-xs text-gray-600 truncate mb-1">
              {session.lastMessage.content || session.lastMessage}
            </p>
          )}
          <p className="text-xs text-gray-500">
            {formatRelativeTime(session.updatedAt)}
          </p>
        </button>
      ))}
    </div>
  );
};

export default SessionList;
