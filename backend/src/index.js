require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./logger');
const { isConfigured, AI_CONFIG } = require('./aiService');

const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const chatRoutes = require('./routes/chat');
const searchRoutes = require('./routes/search');

const app = express();
const PORT = process.env.PORT || 8794;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(logger.requestMiddleware);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TimelineGPT API',
    timestamp: new Date().toISOString(),
    aiConfigured: isConfigured(),
    aiModel: AI_CONFIG.model,
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/search', searchRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`TimelineGPT API running on port ${PORT}`);
  logger.info(`AI service: ${isConfigured() ? `configured (model: ${AI_CONFIG.model})` : 'demo mode (no API key)'}`);
});
