const jwt = require('jsonwebtoken');
const logger = require('../logger');

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '需要登录认证' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    logger.warn('Auth token verification failed', { error: err.message });
    return res.status(401).json({ error: '登录已过期或无效' });
  }
};

module.exports = auth;
