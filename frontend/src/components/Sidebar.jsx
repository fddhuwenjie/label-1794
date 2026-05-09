import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Sidebar({ conversations, activeId, open, onSelect, onNew, onDelete, onRename, onToggle, onSettings, onSearchResultClick }) {
  const { user, logout } = useAuth();
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  const performSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    setSearching(true);
    try {
      const data = await api.searchMessages(query.trim());
      setSearchResults(data.results || []);
      setShowSearchResults(true);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
      searchInputRef.current?.blur();
    }
  };

  const handleResultClick = (result) => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    if (onSearchResultClick) {
      onSearchResultClick(result.conversation_id, result.message_id);
    }
  };

  const startRename = (c) => { setEditingId(c.id); setEditTitle(c.title); };
  const saveRename = (id) => { if (editTitle.trim()) onRename(id, editTitle.trim()); setEditingId(null); };

  const formatDate = (d) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now - date;
    if (diff < 86400000) return '今天';
    if (diff < 172800000) return '昨天';
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const formatTime = (d) => {
    const date = new Date(d);
    return date.toLocaleString('zh-CN', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onToggle} />}

      <aside className={`fixed lg:relative z-40 h-full bg-surface-900 border-r border-surface-800/50 flex flex-col transition-all duration-300 ${open ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 overflow-hidden border-r-0'}`}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-surface-800/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold">T</div>
            <span className="font-semibold text-sm text-white">TimelineGPT</span>
          </div>
          <button onClick={onToggle} className="p-1.5 hover:bg-surface-800 rounded-lg transition" aria-label="关闭侧栏">
            <svg className="w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-3 shrink-0 border-b border-surface-800/50">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="搜索消息..."
              className="w-full pl-9 pr-8 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition text-sm"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-surface-500 border-t-primary-500 rounded-full animate-spin"></div>
              </div>
            )}
            {searchQuery && !searching && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-surface-700 rounded transition"
              >
                <svg className="w-3 h-3 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="p-3 shrink-0">
          <button onClick={onNew} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-surface-700/50 hover:bg-surface-800 text-sm text-surface-300 hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            新对话
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {showSearchResults && searchResults.length > 0 ? (
            <div className="absolute inset-0 bg-surface-900 z-10 overflow-y-auto px-2 py-2 space-y-1">
              <p className="text-xs text-surface-500 px-3 py-1">找到 {searchResults.length} 条结果</p>
              {searchResults.map((result) => (
                <div
                  key={`${result.conversation_id}-${result.message_id}`}
                  onClick={() => handleResultClick(result)}
                  className="group px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:bg-surface-800/50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${result.role === 'user' ? 'bg-primary-600/30 text-primary-400' : 'bg-surface-700 text-surface-400'}`}>
                      {result.role === 'user' ? '你' : 'AI'}
                    </span>
                    <span className="text-xs text-surface-500">{formatTime(result.created_at)}</span>
                  </div>
                  <p className="text-sm text-white truncate mb-1">{result.conversation_title}</p>
                  <p 
                    className="text-xs text-surface-400 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: result.snippet }}
                  />
                </div>
              ))}
            </div>
          ) : showSearchResults && searchResults.length === 0 ? (
            <div className="absolute inset-0 bg-surface-900 z-10 flex items-center justify-center">
              <p className="text-center text-surface-500 text-sm">未找到匹配的消息</p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto px-2 space-y-0.5">
              {conversations.map(c => (
                <div key={c.id}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm ${
                    activeId === c.id ? 'bg-surface-800 text-white' : 'text-surface-400 hover:bg-surface-800/50 hover:text-surface-200'
                  }`}
                  onClick={() => { if (editingId !== c.id) onSelect(c.id); }}
                >
                  <svg className="w-4 h-4 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  {editingId === c.id ? (
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} autoFocus
                      onBlur={() => saveRename(c.id)} onKeyDown={e => { if (e.key === 'Enter') saveRename(c.id); if (e.key === 'Escape') setEditingId(null); }}
                      className="flex-1 bg-surface-700 rounded px-2 py-0.5 text-white text-sm outline-none" onClick={e => e.stopPropagation()} />
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm">{c.title}</p>
                      {c.last_message && (
                        <p className="truncate text-xs text-surface-500 mt-0.5">{c.last_message.substring(0, 40)}</p>
                      )}
                      <p className="text-xs text-surface-600 mt-0.5">{formatDate(c.updated_at)}</p>
                    </div>
                  )}
                  {editingId !== c.id && (
                    <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                      <button onClick={e => { e.stopPropagation(); startRename(c); }} className="p-1 hover:bg-surface-700 rounded transition" aria-label="重命名">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      {confirmDeleteId === c.id ? (
                        <button onClick={e => { e.stopPropagation(); onDelete(c.id); setConfirmDeleteId(null); }} className="p-1 bg-red-600 rounded transition text-white" aria-label="确认删除">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </button>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(c.id); setTimeout(() => setConfirmDeleteId(null), 3000); }} className="p-1 hover:bg-red-600/20 rounded transition text-surface-400 hover:text-red-400" aria-label="删除">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 01-16.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {conversations.length === 0 && (
                <p className="text-center text-surface-500 text-xs py-8">暂无对话</p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-surface-800/50 p-3 space-y-2 shrink-0">
          <button onClick={onSettings} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-800 text-sm text-surface-400 hover:text-white transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            设置
          </button>
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-300">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user?.username}</p>
              <p className="text-xs text-surface-500 truncate">{user?.email}</p>
            </div>
            <button onClick={logout} className="p-1.5 hover:bg-surface-800 rounded-lg transition text-surface-400 hover:text-red-400" aria-label="退出登录" title="退出登录">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
