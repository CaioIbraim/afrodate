// components/MatchList.tsx
import { useMatches } from '@/hooks/useMatches';
import Image from 'next/image';

interface MatchListProps {
  selectedId: string | null;
  onSelect: (matchId: string, conversationId: string | null) => void;
}

export const MatchList = ({ selectedId, onSelect }: MatchListProps) => {
  const { matches, loading, error } = useMatches();

  if (loading) return <div className="p-4">Carregando...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (matches.length === 0) return <div className="p-4">Nenhum match encontrado</div>;

  return (
    <ul className="divide-y divide-gray-200">
      {matches.map((match) => (
        <li
          key={match.match_id}
          className={`p-4 cursor-pointer ${selectedId === match.match_id ? 'bg-gray-100' : ''}`}
          onClick={() => onSelect(match.match_id, match.conversation_id)}
        >
          <div className="flex items-center">
            <Image
              src={match.other_avatar_url || '/placeholder.svg'}
              alt={match.other_name || 'Usuário'}
              width={40}
              height={40}
              className="rounded-full"
            />
            <div className="ml-3">
              <p className="font-medium">{match.other_name || 'Usuário'}</p>
              <p className="text-sm text-gray-500">
                {match.last_message_at ? `Última mensagem em ${new Date(match.last_message_at).toLocaleString()}` : 'Nova conversa'}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};