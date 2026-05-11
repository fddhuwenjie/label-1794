const logger = require('./logger');

const AI_CONFIG = {
  apiKey: process.env.AI_API_KEY || '',
  apiUrl: process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions',
  model: process.env.AI_MODEL || 'gpt-3.5-turbo',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2048', 10),
  systemPrompt: process.env.AI_SYSTEM_PROMPT || 'You are TimelineGPT, a helpful AI assistant.',
};

function isConfigured() {
  return !!AI_CONFIG.apiKey;
}

async function chat(history) {
  if (!isConfigured()) {
    return { content: generateFallbackResponse(history), isMock: true };
  }

  try {
    const response = await fetch(AI_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [{ role: 'system', content: AI_CONFIG.systemPrompt }, ...history],
        max_tokens: AI_CONFIG.maxTokens,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      logger.error('AI API returned non-OK status', { status: response.status, body: errBody });
      return { content: generateFallbackResponse(history), isMock: true };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '抱歉，无法生成回复。';
    return { content, isMock: false };
  } catch (err) {
    logger.error('AI API call failed', { error: err.message });
    return { content: generateFallbackResponse(history), isMock: true };
  }
}

async function* chatStream(history, abortSignal) {
  if (!isConfigured()) {
    const mockContent = generateFallbackResponse(history);
    for (let i = 0; i < mockContent.length; i++) {
      if (abortSignal.aborted) return;
      yield { content: mockContent[i], done: false, isMock: true };
      await new Promise(r => setTimeout(r, 50));
    }
    yield { content: '', done: true, isMock: true };
    return;
  }

  try {
    const response = await fetch(AI_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [{ role: 'system', content: AI_CONFIG.systemPrompt }, ...history],
        max_tokens: AI_CONFIG.maxTokens,
        stream: true,
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errBody = await response.text();
      logger.error('AI API returned non-OK status', { status: response.status, body: errBody });
      const mockContent = generateFallbackResponse(history);
      for (let i = 0; i < mockContent.length; i++) {
        if (abortSignal.aborted) return;
        yield { content: mockContent[i], done: false, isMock: true };
        await new Promise(r => setTimeout(r, 50));
      }
      yield { content: '', done: true, isMock: true };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      if (abortSignal.aborted) {
        await reader.cancel();
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield { content: '', done: true, isMock: false };
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              yield { content: delta, done: false, isMock: false };
            }
          } catch (e) {
            logger.warn('Failed to parse SSE data', { data });
          }
        }
      }
    }
    yield { content: '', done: true, isMock: false };
  } catch (err) {
    if (err.name !== 'AbortError') {
      logger.error('AI stream call failed', { error: err.message });
    }
    yield { content: '', done: true, isMock: false };
  }
}

function generateFallbackResponse(history) {
  const lastUserMsg = [...history].reverse().find(m => m.role === 'user')?.content || '';
  const snippet = lastUserMsg.substring(0, 30);
  const responses = [
    `关于"${snippet}..."这个问题很有意思。我目前运行在演示模式，配置 AI API 密钥后即可提供真实回复。`,
    `感谢你的消息！我正在演示模式下运行。在配置 API 密钥的生产环境中，我会提供详细的智能回复。`,
    `好问题！当前未配置 AI API 密钥，这是一条模拟回复。配置 API 集成后即可获得完整体验。`,
    `感谢你的输入！TimelineGPT 当前处于演示模式。配置 API 密钥后，我可以提供全面的、上下文感知的回复。`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

module.exports = { chat, chatStream, isConfigured, AI_CONFIG, generateFallbackResponse };
