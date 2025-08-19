
import { useMatches } from '@/hooks/useMatches';
import Image from 'next/image';

interface MatchListProps {
  selectedId: string | null;
  onSelect: (matchId: string, conversationId: string | null) => void;
}

export const MatchList = ({ selectedId, onSelect }: MatchListProps) => {
  const { matches, loading, error } = useMatches();

  if (loading) return <div className="p-4 sm:p-5 text-center text-gray-500 text-sm sm:text-base">Carregando...</div>;
  if (error) return <div className="p-4 sm:p-5 text-center text-red-500 text-sm sm:text-base">{error}</div>;
  if (matches.length === 0) return <div className="p-4 sm:p-5 text-center text-gray-500 text-sm sm:text-base">Nenhum match encontrado</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 sm:p-5 border-b sm:border-b-0">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Matches</h2>
      </div>
      <ul className="divide-y divide-gray-200 overflow-y-auto flex-1">
        {matches.map((match) => (
          <li
            key={match.match_id}
            className={`p-4 sm:p-5 cursor-pointer hover:bg-gray-50 ${
              selectedId === match.match_id ? 'bg-gray-100' : ''
            }`}
            onClick={() => onSelect(match.match_id, match.conversation_id)}
          >
            <div className="flex items-center">
              <Image
                src={match.other_avatar_url || '/placeholder.svg'}
                alt={match.other_name || 'Usuário'}
                width={40}
                height={40}
                className="rounded-full object-cover"
                style={{ aspectRatio: '1 / 1' }}
              />
              <div className="ml-3 sm:ml-4">
                <p className="font-medium text-sm sm:text-base text-gray-800">
                  {match.other_name || 'Usuário'}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {match.last_message_at
                    ? `Última mensagem em ${new Date(match.last_message_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : 'Nova conversa'}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
