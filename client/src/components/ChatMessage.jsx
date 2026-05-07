import { User, Bot, FileText } from 'lucide-react';

export default function ChatMessage({ message, showProjectName = false }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary-600" />
        </div>
      )}

      <div className={`flex flex-col max-w-3xl ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-lg ${
            isUser
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-500 font-medium">Sources:</p>
            {message.sources.map((source, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded"
              >
                <FileText className="w-3 h-3" />
                <span>{source.fileName}</span>
                {showProjectName && source.projectName && (
                  <span className="text-gray-400">• {source.projectName}</span>
                )}
                <span className="text-gray-400">
                  (Score: {(source.relevanceScore * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        )}

        <span className="text-xs text-gray-400 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
          <User className="w-5 h-5 text-gray-600" />
        </div>
      )}
    </div>
  );
}
