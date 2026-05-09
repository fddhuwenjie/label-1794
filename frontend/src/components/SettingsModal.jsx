import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function SettingsModal({ onClose }) {
  const { user, updateProfile, logout } = useAuth();
  const { settings, updateSetting, resetSettings } = useSettings();
  const [tab, setTab] = useState('appearance');
  const [form, setForm] = useState({ username: user?.username || '', email: user?.email || '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      await updateProfile(form);
      setMsg('资料已更新');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'appearance', label: '外观', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
    { id: 'chat', label: '对话', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { id: 'profile', label: '账户', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'about', label: '关于', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  const Toggle = ({ checked, onChange, label, desc }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm text-white">{label}</p>
        {desc && <p className="text-xs text-surface-500 mt-0.5">{desc}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-surface-700'}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );

  const Select = ({ value, onChange, label, desc, options }) => (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm text-white">{label}</p>
          {desc && <p className="text-xs text-surface-500 mt-0.5">{desc}</p>}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${value === opt.value 
              ? 'bg-primary-600 text-white' 
              : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-white'}`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-surface-900 rounded-2xl border border-surface-700/50 shadow-2xl animate-fade-in max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800/50 shrink-0">
          <h3 className="text-lg font-semibold text-white">设置</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-800 rounded-lg transition" aria-label="关闭">
            <svg className="w-5 h-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar tabs */}
          <div className="w-40 border-r border-surface-800/50 p-2 shrink-0">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition mb-1 ${
                  tab === t.id ? 'bg-surface-800 text-white' : 'text-surface-400 hover:bg-surface-800/50 hover:text-white'
                }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
                </svg>
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {tab === 'appearance' && (
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-4">外观设置</h4>
                
                <Select
                  label="主题模式"
                  desc="选择界面的颜色主题"
                  value={settings.theme}
                  onChange={(v) => updateSetting('theme', v)}
                  options={[
                    { value: 'dark', label: '深色' },
                    { value: 'light', label: '浅色' },
                  ]}
                />

                <div className="border-t border-surface-800/50 my-2" />

                <Select
                  label="字体大小"
                  desc="调整界面文字的大小"
                  value={settings.fontSize}
                  onChange={(v) => updateSetting('fontSize', v)}
                  options={[
                    { value: 'small', label: '小' },
                    { value: 'medium', label: '中' },
                    { value: 'large', label: '大' },
                  ]}
                />
              </div>
            )}

            {tab === 'chat' && (
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-4">对话设置</h4>
                
                <Toggle
                  label="按 Enter 发送"
                  desc="按 Enter 键直接发送消息，Shift+Enter 换行"
                  checked={settings.sendOnEnter}
                  onChange={(v) => updateSetting('sendOnEnter', v)}
                />

                <div className="border-t border-surface-800/50 my-2" />

                <Toggle
                  label="显示时间戳"
                  desc="在消息旁边显示发送时间"
                  checked={settings.showTimestamps}
                  onChange={(v) => updateSetting('showTimestamps', v)}
                />

                <div className="border-t border-surface-800/50 my-2" />

                <Toggle
                  label="自动滚动"
                  desc="收到新消息时自动滚动到底部"
                  checked={settings.autoScroll}
                  onChange={(v) => updateSetting('autoScroll', v)}
                />
              </div>
            )}

            {tab === 'profile' && (
              <div className="space-y-4">
                <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-4">账户信息</h4>
                
                <div className="flex items-center gap-4 p-4 bg-surface-800/50 rounded-xl mb-6">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-xl font-bold text-white">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user?.username}</p>
                    <p className="text-sm text-surface-400">{user?.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-surface-400 mb-1.5">用户名</label>
                  <input value={form.username} onChange={set('username')}
                    className="w-full px-4 py-2.5 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm focus:outline-none focus:border-primary-500 transition" />
                </div>
                <div>
                  <label className="block text-sm text-surface-400 mb-1.5">邮箱</label>
                  <input value={form.email} onChange={set('email')} type="email"
                    className="w-full px-4 py-2.5 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm focus:outline-none focus:border-primary-500 transition" />
                </div>
                
                {msg && <p className={`text-sm ${msg.includes('已更新') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
                
                <div className="flex gap-3 pt-2">
                  <button onClick={save} disabled={saving}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm transition disabled:opacity-50">
                    {saving ? '保存中...' : '保存更改'}
                  </button>
                  <button onClick={() => { logout(); onClose(); }}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl text-sm transition">
                    退出登录
                  </button>
                </div>


              </div>
            )}

            {tab === 'about' && (
              <div className="space-y-4">
                <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-4">关于 TimelineGPT</h4>
                
                <div className="flex items-center gap-4 p-4 bg-surface-800/50 rounded-xl">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-lg font-bold text-white">
                    T
                  </div>
                  <div>
                    <p className="text-white font-medium">TimelineGPT</p>
                    <p className="text-sm text-surface-400">版本 1.0.0</p>
                  </div>
                </div>

                <div className="text-sm text-surface-400 space-y-3 mt-4">
                  <p>基于 React、Express 和 SQLite 构建的现代化 AI 对话界面。</p>
                  <p>API 集成已就绪 - 在后端 .env 文件中配置你的 API 密钥即可启用真实 AI 回复。</p>
                </div>

                <div className="border-t border-surface-800/50 pt-4 mt-4">
                  <h5 className="text-sm text-white mb-3">技术栈</h5>
                  <div className="flex flex-wrap gap-2">
                    {['React', 'Vite', 'TailwindCSS', 'Express', 'SQLite', 'JWT'].map(tech => (
                      <span key={tech} className="px-2.5 py-1 bg-surface-800 rounded-lg text-xs text-surface-400">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>


              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
