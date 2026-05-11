const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const logger = require('../logger');
const aiService = require('../aiService');

const router = express.Router();
router.use(auth);

router.post('/:conversationId/messages', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    const convo = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
      .get(req.params.conversationId, req.userId);
    if (!convo) return res.status(404).json({ error: '对话不存在' });

    db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
      .run(convo.id, 'user', content.trim());

    const msgCount = db.prepare('SELECT COUNT(*) as c FROM messages WHERE conversation_id = ?').get(convo.id).c;
    if (msgCount === 1 && convo.title === 'New Chat') {
      const autoTitle = content.trim().substring(0, 50) + (content.trim().length > 50 ? '...' : '');
      db.prepare('UPDATE conversations SET title = ? WHERE id = ?').run(autoTitle, convo.id);
    }

    const history = db.prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
      .all(convo.id);
    const aiResult = await aiService.chat(history);

    db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
      .run(convo.id, 'assistant', aiResult.content);

    db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(convo.id);

    const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(convo.id);
    res.json({ messages, isMock: aiResult.isMock });
  } catch (err) {
    logger.error('Failed to process message', { error: err.message, stack: err.stack });
    res.status(500).json({ error: '消息处理失败' });
  }
});

router.post('/:conversationId/messages/stream', async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: '消息内容不能为空' });
  }

  const convo = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
    .get(req.params.conversationId, req.userId);
  if (!convo) return res.status(404).json({ error: '对话不存在' });

  db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
    .run(convo.id, 'user', content.trim());

  const msgCount = db.prepare('SELECT COUNT(*) as c FROM messages WHERE conversation_id = ?').get(convo.id).c;
  if (msgCount === 1 && convo.title === 'New Chat') {
    const autoTitle = content.trim().substring(0, 50) + (content.trim().length > 50 ? '...' : '');
    db.prepare('UPDATE conversations SET title = ? WHERE id = ?').run(autoTitle, convo.id);
  }

  const history = db.prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(convo.id);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const abortController = new AbortController();
  let clientClosed = false;

  req.on('close', () => {
    clientClosed = true;
    abortController.abort();
  });

  let fullContent = '';

  const sendSSE = (data) => {
    if (clientClosed) return;
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const mockContent = aiService.generateFallbackResponse(history);
    
    for (let i = 0; i < mockContent.length; i++) {
      if (clientClosed) break;
      
      const char = mockContent[i];
      fullContent += char;
      
      sendSSE({ content: char, done: false });
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    if (!clientClosed) {
      sendSSE({ content: '', done: true });
    }
  } catch (err) {
    logger.error('Stream error', { error: err.message });
  } finally {
    if (fullContent && !clientClosed) {
      db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
        .run(convo.id, 'assistant', fullContent);
      db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(convo.id);
    }
    if (!clientClosed) {
      res.end();
    }
  }
});

module.exports = router;
