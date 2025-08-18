// components/chat/ChatHeader.tsx
import type { Profile } from '@/types';

interface ChatHeaderProps {
  participant: Profile;
}

export function ChatHeader({ participant }: ChatHeaderProps) {
  return (
    <header className="p-4 border-b flex items-center gap-4 bg-cyan-50">
      <img
        src={participant.avatar_url || "/placeholder-image.png"}
        alt={participant.name}
        className="w-14 h-14 rounded-full object-cover"
      />
      <h3 className="text-xl font-semibold">{participant.name}</h3>
    </header>
  );
}