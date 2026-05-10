const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const logger = require('../logger');
const aiService = require('../aiService');

const router = express.Router();
router.use(auth);

// Send message and get AI response (streaming via SSE)
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

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Disable Nagle's algorithm to ensure immediate data delivery
    if (res.socket) {
      res.socket.setNoDelay(true);
    }

    // Get AI response via streaming service
    const history = db.prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
      .all(convo.id);

    let fullContent = '';
    let isMock = false;
    let cleanupFn = null;
    let isStopped = false;

    const sendEvent = (data) => {
      if (res.writableEnded) return;
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof res.flush === 'function') {
        res.flush();
      }
    };

    const flushAndClose = () => {
      if (!res.writableEnded) {
        try {
          res.end();
        } catch (e) {}
      }
    };

    const onChunk = (chunk) => {
      if (isStopped) return;
      fullContent += chunk;
      sendEvent({ content: chunk, done: false });
    };

    const onDone = (finalContent, mock) => {
      if (isStopped) return;
      isMock = mock;
      
      // Save AI response to database
      try {
        db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
          .run(convo.id, 'assistant', fullContent || finalContent);
        db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(convo.id);
      } catch (err) {
        logger.error('Failed to save AI message', { error: err.message });
      }
      
      sendEvent({ content: '', done: true, isMock });
      flushAndClose();
    };

    // Handle client disconnect
    req.on('close', () => {
      isStopped = true;
      if (cleanupFn) cleanupFn();
      
      // Save partial content if stopped mid-stream
      if (fullContent && fullContent.trim()) {
        try {
          const existing = db.prepare('SELECT id FROM messages WHERE conversation_id = ? AND role = ? ORDER BY id DESC').get(convo.id, 'assistant');
          if (!existing) {
            db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
              .run(convo.id, 'assistant', fullContent);
            db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(convo.id);
          }
        } catch (err) {
          logger.error('Failed to save partial message', { error: err.message });
        }
      }
      
      flushAndClose();
    });

    cleanupFn = await aiService.chatStream(history, onChunk, onDone);
  } catch (err) {
    logger.error('Failed to process message', { error: err.message, stack: err.stack });
    if (!res.headersSent) {
      res.status(500).json({ error: '消息处理失败' });
    } else if (!res.writableEnded) {
      try {
        res.write(`data: ${JSON.stringify({ content: '', done: true, error: err.message })}\n\n`);
        res.end();
      } catch (e) {}
    }
  }
});

module.exports = router;
