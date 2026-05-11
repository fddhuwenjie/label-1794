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

function streamRequest(path, body, onChunk, onComplete, onError) {
  const token = localStorage.getItem('token');
  const abortController = new AbortController();

  const startStream = async () => {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: '请求失败' }));
        throw new Error(errData.error || '请求失败');
      }

      if (!res.body) {
        throw new Error('响应体为空');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullContent = '';
      let isCompleted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                onChunk(parsed.content, fullContent);
              }
              if (parsed.done) {
                isCompleted = true;
                onComplete(fullContent);
                return fullContent;
              }
            } catch (e) {
              console.warn('Failed to parse stream data:', data, e);
            }
          }
        }
      }
      
      if (!isCompleted) {
        onComplete(fullContent);
      }
      return fullContent;
    } catch (err) {
      console.error('Stream request error:', err);
      if (err.name !== 'AbortError') {
        onError(err);
      }
      return '';
    }
  };

  setTimeout(startStream, 0);
  return abortController;
}

const api = {
  login: (login, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
  register: (username, email, password) => request('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) }),
  getMe: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  resetPassword: (email) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email }) }),
  confirmReset: (token, newPassword) => request('/auth/reset-password/confirm', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
  getConversations: () => request('/conversations'),
  createConversation: (title) => request('/conversations', { method: 'POST', body: JSON.stringify({ title }) }),
  getConversation: (id) => request(`/conversations/${id}`),
  updateConversation: (id, title) => request(`/conversations/${id}`, { method: 'PUT', body: JSON.stringify({ title }) }),
  deleteConversation: (id) => request(`/conversations/${id}`, { method: 'DELETE' }),
  sendMessage: (conversationId, content) => request(`/chat/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  streamMessage: (conversationId, content, onChunk, onComplete, onError) => 
    streamRequest(`/chat/${conversationId}/messages/stream`, { content }, onChunk, onComplete, onError),
  searchMessages: (query) => request(`/search?q=${encodeURIComponent(query)}`)
};

export default api;
