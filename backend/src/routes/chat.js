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

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    if (res.socket) {
      res.socket.setNoDelay(true);
    }

    const history = db.prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
      .all(convo.id);

    let fullContent = '';
    let isMock = false;
    let clientClosed = false;

    res.on('close', () => {
      clientClosed = true;
    });

    const sendSSE = (data) => {
      if (clientClosed) return false;
      try {
        const ok = res.write(`data: ${JSON.stringify(data)}\n\n`);
        if (typeof res.flush === 'function') res.flush();
        return ok;
      } catch {
        return false;
      }
    };

    for await (const chunk of aiService.chatStream(history)) {
      if (clientClosed) break;

      if (chunk.content) {
        fullContent += chunk.content;
      }
      if (chunk.isMock) isMock = true;

      if (!sendSSE({ content: chunk.content, done: chunk.done, isMock: isMock || false })) break;

      if (chunk.done) break;
    }

    const contentToSave = fullContent || '（回复被中断）';
    db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
      .run(convo.id, 'assistant', contentToSave);
    db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(convo.id);

    res.end();
  } catch (err) {
    logger.error('Failed to process message', { error: err.message, stack: err.stack });
    if (!res.headersSent) {
      res.status(500).json({ error: '消息处理失败' });
    } else {
      try {
        res.write(`data: ${JSON.stringify({ content: '', done: true, error: '消息处理失败' })}\n\n`);
      } catch { /* connection already closed */ }
      res.end();
    }
  }
});

module.exports = router;
