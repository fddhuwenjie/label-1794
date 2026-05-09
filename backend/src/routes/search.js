const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();
router.use(auth);

function generateSnippet(content, keywords) {
  const lowerContent = content.toLowerCase();
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  
  let firstMatchIndex = -1;
  for (const kw of lowerKeywords) {
    const idx = lowerContent.indexOf(kw);
    if (idx !== -1 && (firstMatchIndex === -1 || idx < firstMatchIndex)) {
      firstMatchIndex = idx;
    }
  }
  
  if (firstMatchIndex === -1) {
    return content.substring(0, 100) + (content.length > 100 ? '...' : '');
  }
  
  const snippetStart = Math.max(0, firstMatchIndex - 50);
  const snippetEnd = Math.min(content.length, firstMatchIndex + 50);
  
  let snippet = content.substring(snippetStart, snippetEnd);
  
  if (snippetStart > 0) {
    snippet = '...' + snippet;
  }
  if (snippetEnd < content.length) {
    snippet = snippet + '...';
  }
  
  for (const kw of keywords) {
    const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    snippet = snippet.replace(regex, '<mark>$&</mark>');
  }
  
  return snippet;
}

function countMatches(content, keywords) {
  const lowerContent = content.toLowerCase();
  let count = 0;
  for (const kw of keywords) {
    const lowerKw = kw.toLowerCase();
    let pos = 0;
    while ((pos = lowerContent.indexOf(lowerKw, pos)) !== -1) {
      count++;
      pos += lowerKw.length;
    }
  }
  return count;
}

router.get('/', (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || !q.trim()) {
      return res.status(400).json({ error: '搜索关键词不能为空' });
    }
    
    const keywords = q.trim().split(/\s+/).filter(k => k.length > 0);
    
    if (keywords.length === 0) {
      return res.status(400).json({ error: '搜索关键词不能为空' });
    }
    
    const likeConditions = keywords.map(() => "LOWER(m.content) LIKE LOWER(?)").join(' AND ');
    const likeParams = keywords.map(k => `%${k}%`);
    
    const query = `
      SELECT 
        m.id as message_id,
        m.content,
        m.created_at,
        m.role,
        c.id as conversation_id,
        c.title as conversation_title
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.user_id = ? AND ${likeConditions}
      ORDER BY m.created_at DESC
    `;
    
    const results = db.prepare(query).all(req.userId, ...likeParams);
    
    const resultsWithSnippet = results.map(r => ({
      message_id: r.message_id,
      conversation_id: r.conversation_id,
      conversation_title: r.conversation_title,
      snippet: generateSnippet(r.content, keywords),
      created_at: r.created_at,
      role: r.role,
      match_count: countMatches(r.content, keywords)
    }));
    
    resultsWithSnippet.sort((a, b) => b.match_count - a.match_count);
    
    const finalResults = resultsWithSnippet.slice(0, 50).map(r => ({
      message_id: r.message_id,
      conversation_id: r.conversation_id,
      conversation_title: r.conversation_title,
      snippet: r.snippet,
      created_at: r.created_at,
      role: r.role
    }));
    
    res.json({ results: finalResults, total: resultsWithSnippet.length });
  } catch (err) {
    logger.error('Failed to search messages', { error: err.message, userId: req.userId });
    res.status(500).json({ error: '搜索失败' });
  }
});

module.exports = router;
