// components/ChatLayout.tsx
import { MatchList } from './MatchList';
import { ChatWindow } from './ChatWindow';

interface ChatLayoutProps {
  selectedMatchId: string | null;
  onSelectMatch: (matchId: string, conversationId: string | null) => void;
}

export const ChatLayout = ({ selectedMatchId, onSelectMatch }: ChatLayoutProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 h-screen">
      <div className="col-span-1 border-r">
        <MatchList selectedId={selectedMatchId} onSelect={onSelectMatch} />
      </div>
      <div className="col-span-2">
        {selectedMatchId ? (
          <ChatWindow matchId={selectedMatchId} />
        ) : (
          <div className="flex items-center justify-center h-full">Selecione um match</div>
        )}
      </div>
    </div>
  );
};