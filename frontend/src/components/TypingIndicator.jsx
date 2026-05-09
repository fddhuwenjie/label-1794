export default function TypingIndicator() {
  return (
    <div className="flex gap-3 py-4 animate-fade-in">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 text-xs font-bold text-white">T</div>
      <div className="bg-surface-800 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-surface-400 animate-pulse-dot" />
        <div className="w-2 h-2 rounded-full bg-surface-400 animate-pulse-dot [animation-delay:0.16s]" />
        <div className="w-2 h-2 rounded-full bg-surface-400 animate-pulse-dot [animation-delay:0.32s]" />
      </div>
    </div>
  );
}
