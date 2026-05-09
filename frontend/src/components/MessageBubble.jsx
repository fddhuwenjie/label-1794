import { useSettings } from '../context/SettingsContext';

export default function MessageBubble({ message }) {
  const { settings } = useSettings();
  const isUser = message.role === 'user';

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex gap-3 py-4 animate-fade-in ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 text-xs font-bold text-white shadow">T</div>
      )}
      <div className={`max-w-[80%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser ? 'bg-primary-600 text-white rounded-br-md' : 'bg-surface-800 text-surface-200 rounded-bl-md'
        }`}>
          {message.content}
        </div>
        {settings.showTimestamps && message.created_at && (
          <span className="text-xs text-surface-500">
            {formatTime(message.created_at)}
          </span>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center shrink-0 text-xs font-bold text-surface-300">U</div>
      )}
    </div>
  );
}
