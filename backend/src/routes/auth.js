const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const authMiddleware = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

const generateToken = (user) =>
  jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Register
router.post('/register', (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: '所有字段都必须填写' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少需要6个字符' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      return res.status(409).json({ error: '用户名或邮箱已存在' });
    }
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)').run(username, email, hash);
    const user = { id: result.lastInsertRowid, username, email };
    logger.info('User registered', { userId: user.id, username });
    res.status(201).json({ user, token: generateToken(user) });
  } catch (err) {
    logger.error('Registration failed', { error: err.message });
    res.status(500).json({ error: '注册失败' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: '所有字段都必须填写' });
    }
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(login, login);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    const { password: _, ...safeUser } = user;
    logger.info('User logged in', { userId: user.id });
    res.json({ user: safeUser, token: generateToken(user) });
  } catch (err) {
    logger.error('Login failed', { error: err.message });
    res.status(500).json({ error: '登录失败' });
  }
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, email, avatar, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ user });
});

// Update profile
router.put('/me', authMiddleware, (req, res) => {
  try {
    const { username, email, avatar } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    db.prepare('UPDATE users SET username = ?, email = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(username || user.username, email || user.email, avatar ?? user.avatar, req.userId);
    const updated = db.prepare('SELECT id, username, email, avatar, created_at FROM users WHERE id = ?').get(req.userId);
    logger.info('Profile updated', { userId: req.userId });
    res.json({ user: updated });
  } catch (err) {
    logger.error('Profile update failed', { error: err.message, userId: req.userId });
    res.status(500).json({ error: '更新失败' });
  }
});

// Reset password request
// NOTE: 当前为简化实现，直接返回重置令牌。生产环境应集成邮件服务（如 nodemailer + SMTP）
// 将令牌通过邮件发送给用户，而非直接在响应中返回。
router.post('/reset-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: '请输入邮箱地址' });

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: '邮箱不存在' });

  const token = jwt.sign({ id: user.id, reset: true }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // TODO: 生产环境应通过邮件发送重置链接，例如:
  // await sendEmail(email, `${FRONTEND_URL}/reset?token=${token}`);
  logger.info('Password reset token generated', { userId: user.id });

  res.json({
    message: '密码重置令牌已生成（演示模式：令牌直接返回，生产环境将通过邮件发送）',
    resetToken: token,
    _notice: '此接口为演示用途，生产环境中令牌不会在响应中返回',
  });
});

// Confirm reset
router.post('/reset-password/confirm', (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: '密码至少需要6个字符' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.reset) return res.status(400).json({ error: '无效的重置令牌' });
    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, decoded.id);
    logger.info('Password reset confirmed', { userId: decoded.id });
    res.json({ message: '密码已更新' });
  } catch (err) {
    logger.error('Password reset confirm failed', { error: err.message });
    res.status(400).json({ error: '无效或已过期的重置令牌' });
  }
});

module.exports = router;
