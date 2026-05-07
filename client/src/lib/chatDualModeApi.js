import api from './api';

/**
 * Create a new chat session
 */
export const createChatSession = async (chatMode, projectId = null) => {
  const response = await api.post('/chat-dual/sessions', {
    chatMode,
    projectId
  });
  return response.data;
};

/**
 * Get all chat sessions
 */
export const getChatSessions = async (chatMode = null, projectId = null) => {
  const params = {};
  if (chatMode) params.chatMode = chatMode;
  if (projectId) params.projectId = projectId;
  
  const response = await api.get('/chat-dual/sessions', { params });
  return response.data;
};

/**
 * Get a single chat session
 */
export const getChatSession = async (sessionId) => {
  const response = await api.get(`/chat-dual/sessions/${sessionId}`);
  return response.data;
};

/**
 * Delete a chat session
 */
export const deleteChatSession = async (sessionId) => {
  const response = await api.delete(`/chat-dual/sessions/${sessionId}`);
  return response.data;
};

/**
 * Send a message in a chat session (SSE streaming)
 */
export const sendMessage = async (sessionId, message, onChunk, onSources, onDone, onError) => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${api.defaults.baseURL}/chat-dual/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'sources') {
            onSources(data.sources);
          } else if (data.type === 'content') {
            onChunk(data.content);
          } else if (data.type === 'done') {
            onDone(data.latency);
          } else if (data.type === 'error') {
            onError(data.error);
          }
        }
      }
    }
  } catch (error) {
    onError(error.message);
  }
};

/**
 * Grant global bot access to a user
 */
export const grantGlobalBotAccess = async (userId) => {
  const response = await api.post(`/chat-dual/permissions/global-bot/${userId}/grant`);
  return response.data;
};

/**
 * Revoke global bot access from a user
 */
export const revokeGlobalBotAccess = async (userId) => {
  const response = await api.post(`/chat-dual/permissions/global-bot/${userId}/revoke`);
  return response.data;
};
