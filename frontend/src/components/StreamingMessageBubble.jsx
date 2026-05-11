import { useSettings } from '../context/SettingsContext';

export default function StreamingMessageBubble({ content, isStreaming }) {
  const { settings } = useSettings();

  return (
    <div className="flex gap-3 py-4 animate-fade-in">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 text-xs font-bold text-white shadow">T</div>
      <div className="max-w-[80%] flex flex-col gap-1 items-start">
        <div className="inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words bg-surface-800 text-surface-200 rounded-bl-md">
          {content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-0.5 bg-primary-500 align-middle animate-blink" />
          )}
        </div>
      </div>
    </div>
  );
}
