const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();
router.use(auth);

// List conversations
router.get('/', (req, res) => {
  try {
    const convos = db.prepare(`
      SELECT c.*, 
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
      FROM conversations c WHERE c.user_id = ? ORDER BY c.updated_at DESC
    `).all(req.userId);
    res.json({ conversations: convos });
  } catch (err) {
    logger.error('Failed to list conversations', { error: err.message, userId: req.userId });
    res.status(500).json({ error: '获取对话列表失败' });
  }
});

// Create conversation
router.post('/', (req, res) => {
  try {
    const { title } = req.body;
    const result = db.prepare('INSERT INTO conversations (user_id, title) VALUES (?, ?)').run(req.userId, title || 'New Chat');
    const convo = db.prepare('SELECT * FROM conversations WHERE id = ?').get(result.lastInsertRowid);
    logger.info('Conversation created', { conversationId: convo.id, userId: req.userId });
    res.status(201).json({ conversation: convo });
  } catch (err) {
    logger.error('Failed to create conversation', { error: err.message, userId: req.userId });
    res.status(500).json({ error: '创建对话失败' });
  }
});

// Get conversation with messages
router.get('/:id', (req, res) => {
  try {
    const convo = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!convo) return res.status(404).json({ error: '对话不存在' });
    const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(convo.id);
    res.json({ conversation: convo, messages });
  } catch (err) {
    logger.error('Failed to get conversation', { error: err.message, conversationId: req.params.id });
    res.status(500).json({ error: '获取对话失败' });
  }
});

// Update conversation title
router.put('/:id', (req, res) => {
  try {
    const { title } = req.body;
    const convo = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!convo) return res.status(404).json({ error: '对话不存在' });
    db.prepare('UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(title, convo.id);
    const updated = db.prepare('SELECT * FROM conversations WHERE id = ?').get(convo.id);
    res.json({ conversation: updated });
  } catch (err) {
    logger.error('Failed to update conversation', { error: err.message, conversationId: req.params.id });
    res.status(500).json({ error: '更新对话失败' });
  }
});

// Delete conversation
router.delete('/:id', (req, res) => {
  try {
    const convo = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!convo) return res.status(404).json({ error: '对话不存在' });
    db.prepare('DELETE FROM conversations WHERE id = ?').run(convo.id);
    logger.info('Conversation deleted', { conversationId: convo.id, userId: req.userId });
    res.json({ message: '对话已删除' });
  } catch (err) {
    logger.error('Failed to delete conversation', { error: err.message, conversationId: req.params.id });
    res.status(500).json({ error: '删除对话失败' });
  }
});

module.exports = router;
