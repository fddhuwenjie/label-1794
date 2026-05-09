import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import api from '../utils/api';
import Sidebar from '../components/Sidebar';
import SettingsModal from '../components/SettingsModal';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';

export default function ChatPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { settings } = useSettings();
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messageRefs = useRef({});

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.getConversations();
      setConversations(data.conversations);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      toast.error('加载对话列表失败');
    }
  }, [toast]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const selectConversation = useCallback(async (id, targetMessageId = null) => {
    try {
      const data = await api.getConversation(id);
      setActiveConvo(data.conversation);
      setMessages(data.messages);
      
      if (targetMessageId) {
        setHighlightMessageId(targetMessageId);
        setTimeout(() => {
          const msgEl = messageRefs.current[targetMessageId];
          if (msgEl) {
            msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          setTimeout(() => {
            setHighlightMessageId(null);
          }, 2000);
        }, 100);
      }
    } catch (err) {
      console.error('Failed to select conversation:', err);
      toast.error('加载对话失败');
    }
  }, [toast]);

  const handleSearchResultClick = useCallback((conversationId, messageId) => {
    selectConversation(conversationId, messageId);
  }, [selectConversation]);

  useEffect(() => {
    if (settings.autoScroll && !highlightMessageId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, settings.autoScroll, highlightMessageId]);

  const createNew = async () => {
    try {
      const data = await api.createConversation();
      setConversations(prev => [data.conversation, ...prev]);
      setActiveConvo(data.conversation);
      setMessages([]);
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to create conversation:', err);
      toast.error('创建对话失败');
    }
  };

  const deleteConvo = async (id) => {
    try {
      await api.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConvo?.id === id) { setActiveConvo(null); setMessages([]); }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      toast.error('删除对话失败');
    }
  };

  const renameConvo = async (id, title) => {
    try {
      await api.updateConversation(id, title);
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
      if (activeConvo?.id === id) setActiveConvo(prev => ({ ...prev, title }));
    } catch (err) {
      console.error('Failed to rename conversation:', err);
      toast.error('重命名失败');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    let convo = activeConvo;
    if (!convo) {
      try {
        const data = await api.createConversation();
        convo = data.conversation;
        setActiveConvo(convo);
        setConversations(prev => [convo, ...prev]);
      } catch (err) {
        console.error('Failed to create conversation for send:', err);
        toast.error('创建对话失败');
        return;
      }
    }
    const userMsg = { id: Date.now(), role: 'user', content: input.trim(), created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const data = await api.sendMessage(convo.id, userMsg.content);
      setMessages(data.messages);
      if (data.isMock) setDemoMode(true);
      loadConversations();
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: '抱歉，出了点问题，请重试。', created_at: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (settings.sendOnEnter && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-surface-950">
      <Sidebar
        conversations={conversations} activeId={activeConvo?.id} open={sidebarOpen}
        onSelect={(id) => selectConversation(id)} onNew={createNew} onDelete={deleteConvo} onRename={renameConvo}
        onToggle={() => setSidebarOpen(p => !p)} onSettings={() => setShowSettings(true)}
        onSearchResultClick={handleSearchResultClick}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center gap-3 px-4 border-b border-surface-800/50 bg-surface-950/80 backdrop-blur-sm shrink-0">
          <button onClick={() => setSidebarOpen(p => !p)} className={`p-2 hover:bg-surface-800 rounded-lg transition ${sidebarOpen ? 'lg:hidden' : ''}`} aria-label="切换侧栏">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h2 className="text-sm font-medium text-surface-300 truncate">{activeConvo?.title || 'TimelineGPT'}</h2>
        </header>

        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-6 shadow-lg shadow-primary-900/30">
                <span className="text-2xl font-bold text-white">T</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">欢迎使用 TimelineGPT</h2>
              <p className="text-surface-400 max-w-md text-sm leading-relaxed">在下方输入消息开始对话，我随时为你提供帮助。</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 max-w-lg w-full">
                {['解释量子计算', '写一个 Python 脚本', '帮我头脑风暴', '总结一篇长文'].map(s => (
                  <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="text-left p-3 rounded-xl border border-surface-700/50 bg-surface-900/50 hover:bg-surface-800 hover:border-surface-600 text-sm text-surface-300 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-4 space-y-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  ref={(el) => { messageRefs.current[msg.id] = el; }}
                  className={`transition-all duration-500 ${
                    highlightMessageId === msg.id 
                      ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-surface-950 rounded-xl animate-pulse bg-primary-500/10' 
                      : ''
                  }`}
                >
                  <MessageBubble message={msg} />
                </div>
              ))}
              {sending && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-surface-800/50 bg-surface-950/80 backdrop-blur-sm shrink-0">
          <div className="max-w-3xl mx-auto relative">
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="输入你的消息..." rows={1}
              className="w-full px-4 py-4 pr-12 bg-surface-800 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition resize-none text-sm"
              style={{ minHeight: '64px', maxHeight: '160px' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }}
            />
            <button onClick={sendMessage} disabled={!input.trim() || sending}
              className="absolute right-3 bottom-4 p-2 rounded-lg bg-primary-600 hover:bg-primary-500 disabled:opacity-30 disabled:hover:bg-primary-600 transition" aria-label="发送消息">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m-7 7l7-7 7 7" /></svg>
            </button>
          </div>
          <p className="text-center text-xs text-surface-600 mt-2">
            {demoMode && <span className="text-amber-500/80">⚡ 演示模式：AI 回复为模拟数据 · </span>}
            TimelineGPT 可能会生成不准确的信息。
          </p>
        </div>
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
