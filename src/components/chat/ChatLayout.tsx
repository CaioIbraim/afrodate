
import { useState } from 'react';
import { MatchList } from './MatchList';
import { ChatWindow } from './ChatWindow';
import { Menu, X } from 'lucide-react';

interface ChatLayoutProps {
  selectedMatchId: string | null;
  onSelectMatch: (matchId: string, conversationId: string | null) => void;
}

export const ChatLayout = ({ selectedMatchId, onSelectMatch }: ChatLayoutProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  return (
    <div className="relative flex h-[calc(100vh-4rem)] w-full">
      {/* Hamburger Button (Mobile Only, Top-Right) */}
      <button
        className="sm:hidden fixed top-4 right-4 z-50 bg-white border border-gray-200 rounded-md p-2 shadow-sm"
        onClick={toggleMenu}
        aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* MatchList: Slide-in on mobile, fixed sidebar on desktop */}
      <div
        className={`${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } sm:translate-x-0 fixed sm:static top-0 left-0 w-64 sm:w-80 h-full bg-white shadow-lg sm:shadow-none transition-transform duration-300 ease-in-out z-40 ${
          isMenuOpen ? 'block' : 'hidden sm:block'
        }`}
      >
        <MatchList
          selectedId={selectedMatchId}
          onSelect={(matchId, conversationId) => {
            onSelectMatch(matchId, conversationId);
            setIsMenuOpen(false); // Close menu on mobile after selection
          }}
        />
      </div>

      {/* Overlay (Mobile Only) */}
      {isMenuOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleMenu}
          aria-hidden="true"
        />
      )}

      {/* ChatWindow: Full width on mobile, remaining space on desktop */}
      <div className="flex-1 w-full flex items-center justify-center sm:ml-0">
        {selectedMatchId ? (
          <ChatWindow matchId={selectedMatchId} />
        ) : (
          <div className="text-center text-gray-500 text-sm sm:text-base p-3 sm:p-4">
            Selecione um match
          </div>
        )}
      </div>
    </div>
  );
};
