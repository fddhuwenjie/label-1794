const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const config = {
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...options.headers },
    ...options
  };
  const res = await fetch(`${BASE}${path}`, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

function sendMessageStream(conversationId, content, callbacks) {
  const token = localStorage.getItem('token');
  const abortController = new AbortController();
  let stopped = false;

  const { onChunk, onDone, onError } = callbacks;

  fetch(`${BASE}/chat/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ content }),
    signal: abortController.signal,
  }).then(async (res) => {
    if (!res.ok) {
      throw new Error('请求失败');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const processBuffer = () => {
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        if (rawEvent.trim()) {
          const lines = rawEvent.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const dataStr = line.slice(5).trim();
              if (dataStr) {
                try {
                  const data = JSON.parse(dataStr);
                  if (data.done) {
                    if (!stopped) onDone && onDone(data);
                    return true;
                  } else if (data.content) {
                    if (!stopped) onChunk && onChunk(data);
                  }
                } catch (e) {
                  console.warn('Failed to parse SSE data:', e);
                }
              }
            }
          }
        }

        boundary = buffer.indexOf('\n\n');
      }
      return false;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim()) {
          processBuffer();
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const shouldStop = processBuffer();
      if (shouldStop) break;
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      console.error('Stream error:', err);
      onError && onError(err);
    }
  });

  return {
    stop: () => {
      stopped = true;
      abortController.abort();
    },
  };
}

const api = {
  // Auth
  login: (login, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
  register: (username, email, password) => request('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) }),
  getMe: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  resetPassword: (email) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email }) }),
  confirmReset: (token, newPassword) => request('/auth/reset-password/confirm', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
  // Conversations
  getConversations: () => request('/conversations'),
  createConversation: (title) => request('/conversations', { method: 'POST', body: JSON.stringify({ title }) }),
  getConversation: (id) => request(`/conversations/${id}`),
  updateConversation: (id, title) => request(`/conversations/${id}`, { method: 'PUT', body: JSON.stringify({ title }) }),
  deleteConversation: (id) => request(`/conversations/${id}`, { method: 'DELETE' }),
  // Chat
  sendMessage: (conversationId, content) => request(`/chat/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  sendMessageStream,
  // Search
  searchMessages: (query) => request(`/search?q=${encodeURIComponent(query)}`)
};

export default api;
