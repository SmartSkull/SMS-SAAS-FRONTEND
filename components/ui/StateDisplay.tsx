import { LucideIcon, Inbox, Loader2 } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  icon?: LucideIcon;
  /** wrap in a card (default true) */
  card?: boolean;
}

export function EmptyState({ message, icon: Icon = Inbox, card = true }: EmptyStateProps) {
  const inner = (
    <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
        <Icon size={26} className="text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 max-w-xs">{message}</p>
    </div>
  );

  return card
    ? <div className="bg-white rounded-2xl card border border-gray-100 shadow-sm">{inner}</div>
    : inner;
}

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="bg-white rounded-2xl card border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3 py-14">
      <Loader2 size={28} className="text-blue-500 animate-spin" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
