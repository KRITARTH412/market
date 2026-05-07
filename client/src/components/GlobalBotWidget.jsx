import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Minimize2, Bot } from 'lucide-react';
import useAuthStore from '../store/authStore';
import {
  createChatSession,
  getChatSession,
  sendMessage
} from '../lib/chatDualModeApi';
import ChatMessage from './ChatMessage';
import toast from 'react-hot-toast';

export default function GlobalBotWidget() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [streamingSources, setStreamingSources] = useState([]);
  const messagesEndRef = useRef(null);

  const hasGlobalAccess = user?.permissions?.includes('GLOBAL_BOT_ACCESS') || 
                          user?.role === 'SUPER_ADMIN' || 
                          user?.role === 'ORG_OWNER' ||
                          user?.role === 'ORG_ADMIN';

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Initialize session when opened
  useEffect(() => {
    if (isOpen && !sessionId && hasGlobalAccess) {
      initializeSession();
    }
  }, [isOpen, hasGlobalAccess]);

  const initializeSession = async () => {
    try {
      setIsLoading(true);
      const data = await createChatSession('global', null);
      setSessionId(data.session.id);
      
      // Add welcome message
      setMessages([{
        role: 'assistant',
        content: 'Hi! I\'m your organization-wide AI assistant. I have access to all documents across all projects. How can I help you today?',
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('Failed to initialize chat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !sessionId || isStreaming) {
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsStreaming(true);
    
    // Reset streaming state
    let fullMessage = '';
    let sources = [];
    setStreamingMessage('');
    setStreamingSources([]);

    // Add user message to UI
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      await sendMessage(
        sessionId,
        userMessage,
        // onChunk
        (content) => {
          fullMessage += content;
          setStreamingMessage(fullMessage);
        },
        // onSources
        (newSources) => {
          sources = newSources;
          setStreamingSources(newSources);
        },
        // onDone
        (latency) => {
          // Add assistant message to messages
          const assistantMessage = {
            role: 'assistant',
            content: fullMessage,
            sources: sources,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
          setStreamingMessage('');
          setStreamingSources([]);
          setIsStreaming(false);
        },
        // onError
        (error) => {
          toast.error(error);
          setIsStreaming(false);
          setStreamingMessage('');
          setStreamingSources([]);
        }
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setIsStreaming(false);
      setStreamingMessage('');
      setStreamingSources([]);
    }
  };

  const handleToggle = () => {
    if (!hasGlobalAccess) {
      toast.error('You do not have access to the Global Bot. Contact your administrator.');
      return;
    }
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  if (!user) {
    return null;
  }

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div 
          className={`fixed bottom-24 right-6 bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300 z-50 ${
            isMinimized ? 'h-14' : 'h-[600px]'
          } w-96 flex flex-col`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Global AI Assistant</h3>
                <p className="text-xs text-blue-100">Organization-wide knowledge</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMinimize}
                className="text-white hover:bg-blue-500 rounded p-1 transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleClose}
                className="text-white hover:bg-blue-500 rounded p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, idx) => (
                      <ChatMessage
                        key={idx}
                        message={message}
                        showProjectName={true}
                      />
                    ))}

                    {/* Streaming message */}
                    {isStreaming && streamingMessage && (
                      <ChatMessage
                        message={{
                          role: 'assistant',
                          content: streamingMessage,
                          sources: streamingSources,
                          timestamp: new Date()
                        }}
                        showProjectName={true}
                      />
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 p-3 bg-white rounded-b-lg">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask anything about your organization..."
                    disabled={isStreaming || isLoading}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isStreaming || isLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={handleToggle}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50 ${
          hasGlobalAccess
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
            : 'bg-gray-400 cursor-not-allowed'
        }`}
        title={hasGlobalAccess ? 'Open Global AI Assistant' : 'No access to Global Bot'}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageSquare className="w-6 h-6 text-white" />
        )}
        {hasGlobalAccess && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </button>
    </>
  );
}
