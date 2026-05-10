import { useSettings } from '../context/SettingsContext';

export default function StreamingMessage({ content }) {
  const { settings } = useSettings();

  return (
    <div className="flex gap-3 py-4 animate-fade-in">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 text-xs font-bold text-white shadow">T</div>
      <div className="max-w-[80%] flex flex-col gap-1 items-start">
        <div className="inline-block rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words bg-surface-800 text-surface-200">
          {content}
          <span className="inline-block w-[2px] h-[1em] ml-[1px] align-text-bottom bg-surface-200 animate-streaming-cursor" />
        </div>
      </div>
    </div>
  );
}
