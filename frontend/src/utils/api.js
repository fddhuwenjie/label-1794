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

function sendMessageStream(conversationId, content, { onChunk, onDone, onError }) {
  const token = localStorage.getItem('token');
  const controller = new AbortController();

  const run = async () => {
    try {
      const res = await fetch(`${BASE}/chat/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ content }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errMsg = '请求失败';
        try { const errData = await res.json(); errMsg = errData.error || errMsg; } catch { /* ignore */ }
        onError?.(new Error(errMsg));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let detectedMock = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            if (json.isMock) detectedMock = true;
            if (json.done) {
              onDone?.(detectedMock);
            } else if (json.content) {
              onChunk?.(json.content, json.isMock);
            }
            if (json.error) {
              onError?.(new Error(json.error));
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      const remaining = buffer.trim();
      if (remaining.startsWith('data: ')) {
        try {
          const json = JSON.parse(remaining.slice(6));
          if (json.isMock) detectedMock = true;
          if (json.done) {
            onDone?.(detectedMock);
          } else if (json.content) {
            onChunk?.(json.content, json.isMock);
          }
        } catch { /* ignore */ }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        onDone?.();
      } else {
        onError?.(err);
      }
    }
  };

  run();

  return controller;
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
  sendMessageStream,
  searchMessages: (query) => request(`/search?q=${encodeURIComponent(query)}`)
};

export default api;
