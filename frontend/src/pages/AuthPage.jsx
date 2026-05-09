import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // login | register | reset | resetConfirm
  const [form, setForm] = useState({ login: '', username: '', email: '', password: '', confirmPassword: '', resetToken: '', newPassword: '' });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const toast = useToast();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.login, form.password);
        toast.success('登录成功');
      } else if (mode === 'register') {
        if (form.password !== form.confirmPassword) throw new Error('两次密码不一致');
        await register(form.username, form.email, form.password);
        toast.success('注册成功');
      } else if (mode === 'reset') {
        const res = await api.resetPassword(form.email);
        toast.success(res.message || '重置链接已发送');
        if (res.resetToken) {
          toast.info('演示模式：令牌已在控制台输出，也已自动填入下方输入框');
          console.log('[Demo] Reset token:', res.resetToken);
          setForm(f => ({ ...f, resetToken: res.resetToken, newPassword: '' }));
        }
        setMode('resetConfirm');
      } else if (mode === 'resetConfirm') {
        if (form.newPassword.length < 6) throw new Error('密码至少需要6个字符');
        await api.confirmReset(form.resetToken, form.newPassword);
        toast.success('密码已重置，请登录');
        setMode('login');
        setForm({ login: '', username: '', email: '', password: '', confirmPassword: '', resetToken: '', newPassword: '' });
      }
    } catch (err) {
      toast.error(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-surface-950 via-surface-900 to-primary-900/20 p-4 relative overflow-hidden">
      {/* 背景装饰元素 */}
      {/* 网格 */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* 浮动光斑 */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary-600/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-primary-500/15 rounded-full blur-3xl animate-float-delay" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-700/10 rounded-full blur-3xl animate-glow-pulse" />

      {/* 小圆点装饰 */}
      <div className="absolute top-[15%] left-[10%] w-2 h-2 bg-primary-400/30 rounded-full animate-float" />
      <div className="absolute top-[25%] right-[15%] w-1.5 h-1.5 bg-primary-300/25 rounded-full animate-float-delay" />
      <div className="absolute bottom-[20%] left-[20%] w-1 h-1 bg-primary-400/35 rounded-full animate-float-slow" />
      <div className="absolute top-[60%] right-[10%] w-2.5 h-2.5 bg-primary-500/20 rounded-full animate-float-slow" />
      <div className="absolute top-[10%] right-[35%] w-1.5 h-1.5 bg-primary-300/20 rounded-full animate-float" />
      <div className="absolute bottom-[30%] right-[30%] w-1 h-1 bg-primary-400/30 rounded-full animate-float-delay" />

      {/* 装饰线条 */}
      <div className="absolute top-0 left-1/4 w-px h-32 bg-gradient-to-b from-transparent via-primary-500/20 to-transparent" />
      <div className="absolute bottom-0 right-1/3 w-px h-40 bg-gradient-to-t from-transparent via-primary-500/15 to-transparent" />

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-lg">T</div>
            <h1 className="text-2xl font-bold text-white">TimelineGPT</h1>
          </div>
          <p className="text-surface-400 text-sm">你的 AI 对话伙伴</p>
        </div>

        <div className="bg-surface-900/80 backdrop-blur-xl rounded-2xl border border-surface-700/50 p-6 shadow-2xl">
          <div className="flex gap-1 mb-6 bg-surface-800 rounded-lg p-1">
            {['login', 'register', 'reset'].map(m => (
              <button key={m} onClick={() => { setMode(m); setForm({ login: '', username: '', email: '', password: '', confirmPassword: '', resetToken: '', newPassword: '' }); }}
                className={`flex-1 py-2 text-sm rounded-md transition-all ${(mode === m || (mode === 'resetConfirm' && m === 'reset')) ? 'bg-primary-600 text-white shadow' : 'text-surface-400 hover:text-white'}`}>
                {m === 'login' ? '登录' : m === 'register' ? '注册' : '重置'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'login' && (
              <input type="text" placeholder="用户名或邮箱" value={form.login} onChange={set('login')} required
                className="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition" />
            )}
            {mode === 'register' && (
              <input type="text" placeholder="用户名" value={form.username} onChange={set('username')} required
                className="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition" />
            )}
            {(mode === 'register' || mode === 'reset') && (
              <input type="email" placeholder="邮箱" value={form.email} onChange={set('email')} required
                className="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition" />
            )}
            {(mode === 'login' || mode === 'register') && (
              <input type="password" placeholder="密码" value={form.password} onChange={set('password')} required
                className="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition" />
            )}
            {mode === 'register' && (
              <input type="password" placeholder="确认密码" value={form.confirmPassword} onChange={set('confirmPassword')} required
                className="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition" />
            )}
            {mode === 'resetConfirm' && (
              <>
                <div>
                  <label className="block text-surface-400 text-xs mb-1">重置令牌</label>
                  <input type="text" placeholder="粘贴重置令牌" value={form.resetToken} onChange={set('resetToken')} required
                    className="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition font-mono text-xs" />
                </div>
                <input type="password" placeholder="新密码（至少6位）" value={form.newPassword} onChange={set('newPassword')} required
                  className="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition" />
              </>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg shadow-primary-900/30">
              {loading ? '请稍候...' : mode === 'login' ? '登录' : mode === 'register' ? '创建账号' : mode === 'resetConfirm' ? '确认重置密码' : '发送重置链接'}
            </button>
          </form>
        </div>


      </div>
    </div>
  );
}
