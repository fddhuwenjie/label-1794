const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const logger = require('../logger');
const aiService = require('../aiService');

const router = express.Router();
router.use(auth);

// Send message and get AI response
router.post('/:conversationId/messages', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    const convo = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
      .get(req.params.conversationId, req.userId);
    if (!convo) return res.status(404).json({ error: '对话不存在' });

    // Save user message
    db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
      .run(convo.id, 'user', content.trim());

    // Auto-title on first message
    const msgCount = db.prepare('SELECT COUNT(*) as c FROM messages WHERE conversation_id = ?').get(convo.id).c;
    if (msgCount === 1 && convo.title === 'New Chat') {
      const autoTitle = content.trim().substring(0, 50) + (content.trim().length > 50 ? '...' : '');
      db.prepare('UPDATE conversations SET title = ? WHERE id = ?').run(autoTitle, convo.id);
    }

    // Get AI response via service
    const history = db.prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
      .all(convo.id);
    const aiResult = await aiService.chat(history);

    // Save AI response
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

module.exports = router;
