interface KeyboardShortcutBadgeProps {
  keys: string;
}

export function KeyboardShortcutBadge({ keys }: KeyboardShortcutBadgeProps) {
  return (
    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-800 border border-gray-700 rounded text-gray-400 leading-none">
      {keys}
    </kbd>
  );
}
