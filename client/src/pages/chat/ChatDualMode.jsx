import { useState, useEffect, useRef } from 'react';
import { Send, Plus, Trash2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import ChatModeSelector from '../../components/ChatModeSelector';
import ChatMessage from '../../components/ChatMessage';
import {
  createChatSession,
  getChatSessions,
  getChatSession,
  deleteChatSession,
  sendMessage
} from '../../lib/chatDualModeApi';
import api from '../../lib/api';

export default function ChatDualMode() {
  const { user } = useAuthStore();
  const [chatMode, setChatMode] = useState('project');
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
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

  // Load projects
  useEffect(() => {
    loadProjects();
  }, []);

  // Load sessions when mode or project changes
  useEffect(() => {
    loadSessions();
  }, [chatMode, selectedProject]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const loadProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data.projects || []);
      
      // Auto-select first project if in project mode
      if (response.data.projects && response.data.projects.length > 0 && chatMode === 'project') {
        setSelectedProject(response.data.projects[0]._id);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const loadSessions = async () => {
    try {
      const data = await getChatSessions(chatMode, selectedProject);
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const handleModeChange = (mode) => {
    setChatMode(mode);
    setCurrentSession(null);
    setMessages([]);
    
    // If switching to project mode and no project selected, select first one
    if (mode === 'project' && !selectedProject && projects.length > 0) {
      setSelectedProject(projects[0]._id);
    }
  };

  const handleProjectChange = (projectId) => {
    setSelectedProject(projectId);
    setCurrentSession(null);
    setMessages([]);
  };

  const handleCreateSession = async () => {
    if (chatMode === 'project' && !selectedProject) {
      toast.error('Please select a project first');
      return;
    }

    try {
      setIsLoading(true);
      const data = await createChatSession(chatMode, selectedProject);
      
      // Load the new session
      const sessionData = await getChatSession(data.session.id);
      setCurrentSession(sessionData.session);
      setMessages(sessionData.session.messages || []);
      
      // Reload sessions list
      loadSessions();
      
      toast.success('New chat session created');
    } catch (error) {
      console.error('Failed to create session:', error);
      if (error.response?.status === 403) {
        toast.error(error.response.data.error || 'Access denied');
      } else {
        toast.error('Failed to create chat session');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSession = async (sessionId) => {
    try {
      setIsLoading(true);
      const data = await getChatSession(sessionId);
      setCurrentSession(data.session);
      setMessages(data.session.messages || []);
    } catch (error) {
      console.error('Failed to load session:', error);
      toast.error('Failed to load chat session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this chat session?')) {
      return;
    }

    try {
      await deleteChatSession(sessionId);
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
      
      loadSessions();
      toast.success('Chat session deleted');
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete chat session');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !currentSession) {
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
        currentSession.id,
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

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Sessions List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={handleCreateSession}
            disabled={isLoading || (chatMode === 'project' && !selectedProject)}
            className="w-full btn btn-primary flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No chat sessions yet</p>
              <p className="text-sm">Create a new chat to get started</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentSession?.id === session.id
                      ? 'bg-primary-50 border-2 border-primary-200'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          session.chatMode === 'global'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {session.chatMode === 'global' ? 'Global' : session.projectName}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {session.lastMessage || 'No messages yet'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {session.messageCount} messages
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Mode Selector */}
        <ChatModeSelector
          selectedMode={chatMode}
          selectedProject={selectedProject}
          projects={projects}
          onModeChange={handleModeChange}
          onProjectChange={handleProjectChange}
          hasGlobalAccess={hasGlobalAccess}
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!currentSession ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No chat session selected</p>
                <p className="text-sm">Create or select a chat session to start</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, idx) => (
                <ChatMessage
                  key={idx}
                  message={message}
                  showProjectName={chatMode === 'global'}
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
                  showProjectName={chatMode === 'global'}
                />
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        {currentSession && (
          <div className="border-t border-gray-200 p-4 bg-white">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={isStreaming}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isStreaming}
                className="btn btn-primary px-6 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
