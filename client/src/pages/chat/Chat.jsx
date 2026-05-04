import { useEffect, useState, useRef } from 'react';
import { Send, Plus, MessageSquare } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import Button from '../../components/Button';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ChatMessage from './ChatMessage';
import SessionList from './SessionList';
import Select from '../../components/Select';

export default function Chat() {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchProjects();
    fetchSessions();
  }, []);

  useEffect(() => {
    if (currentSession) {
      fetchMessages(currentSession.id || currentSession._id);
    }
  }, [currentSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data.projects);
      if (response.data.projects.length > 0) {
        setSelectedProject(response.data.projects[0]._id);
      }
    } catch (error) {
      console.error('Failed to load projects');
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await api.get('/chat/sessions');
      setSessions(response.data.sessions);
    } catch (error) {
      toast.error('Failed to load chat sessions');
    }
  };

  const fetchMessages = async (sessionId) => {
    try {
      const response = await api.get(`/chat/sessions/${sessionId}`);
      setMessages(response.data.session.messages || []);
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const createNewSession = async () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }

    try {
      const response = await api.post('/chat/sessions', {
        projectId: selectedProject,
      });
      const newSession = response.data.session;
      setSessions([newSession, ...sessions]);
      setCurrentSession(newSession);
      setMessages([]);
    } catch (error) {
      toast.error('Failed to create session');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await api.delete(`/chat/sessions/${sessionId}`);
      
      // Remove from sessions list
      setSessions(sessions.filter(s => (s.id || s._id) !== sessionId));
      
      // Clear current session if it was deleted
      if (currentSession && (currentSession.id === sessionId || currentSession._id === sessionId)) {
        setCurrentSession(null);
        setMessages([]);
      }
      
      toast.success('Chat session deleted');
    } catch (error) {
      toast.error('Failed to delete session');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!input.trim()) return;

    if (!currentSession) {
      await createNewSession();
      // Wait a bit for session to be created
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const userMessage = {
      _id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setStreaming(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          sessionId: currentSession?.id || currentSession?._id,
          message: input,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiMessage = {
        _id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        sources: [],
      };

      setMessages(prev => [...prev, aiMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                aiMessage.content += parsed.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = { ...aiMessage };
                  return newMessages;
                });
              }
              if (parsed.sources) {
                aiMessage.sources = parsed.sources;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Refresh sessions to update last message
      fetchSessions();
    } catch (error) {
      toast.error('Failed to send message');
      setMessages(prev => prev.slice(0, -1)); // Remove AI message placeholder
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Sidebar - Sessions */}
      <div className="w-80 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Chat Sessions</h2>
            <Button size="sm" onClick={createNewSession} icon={<Plus className="w-4 h-4" />}>
              New
            </Button>
          </div>

          {projects.length > 0 && (
            <Select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              options={projects.map(p => ({ value: p._id, label: p.name }))}
              className="mb-4"
            />
          )}

          <SessionList
            sessions={sessions}
            currentSession={currentSession}
            onSelectSession={setCurrentSession}
            onDeleteSession={handleDeleteSession}
          />
        </Card>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden" padding={false}>
          {!currentSession ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={<MessageSquare className="w-12 h-12" />}
                title="No chat selected"
                description="Select a chat session or create a new one to start"
                action={createNewSession}
                actionLabel="Start New Chat"
              />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentSession.projectId?.name || 'Chat'}
                </h2>
                <p className="text-sm text-gray-500">
                  AI-powered real estate assistant
                </p>
              </div>

              {/* Messages - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Start a conversation with the AI assistant</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <ChatMessage key={message._id} message={message} />
                  ))
                )}
                {streaming && (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <div className="animate-pulse">●</div>
                    <div className="animate-pulse delay-100">●</div>
                    <div className="animate-pulse delay-200">●</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input - Fixed at bottom */}
              <div className="px-6 py-4 border-t flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex space-x-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about properties, pricing, amenities..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={streaming}
                  />
                  <Button
                    type="submit"
                    disabled={!input.trim() || streaming}
                    loading={streaming}
                    icon={<Send className="w-5 h-5" />}
                  >
                    Send
                  </Button>
                </form>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
