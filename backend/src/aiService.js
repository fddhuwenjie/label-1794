const logger = require('./logger');

// AI provider configuration — extend this to support more providers
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

module.exports = { chat, isConfigured, AI_CONFIG };
