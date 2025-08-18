import { useEffect, useState } from 'react';
import { useMatches } from '@/hooks/useMatches';
import { useUser } from '@/hooks/useUser';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { supabase } from '@/lib/supabase';

interface ChatWindowProps {
  matchId: string;
}

export const ChatWindow = ({ matchId }: ChatWindowProps) => {
  const { matches, refetch, error: matchesError, loading: matchesLoading } = useMatches();
  const { profile, error: userError, loading: userLoading } = useUser();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const match = matches.find((m) => m.match_id === matchId);

  useEffect(() => {
    console.log('ChatWindow: useEffect', { matchId, match, profile, matchesError, userError, matchesLoading, userLoading });
    let isMounted = true;

    const initConversation = async () => {
      try {
        if (matchesError) {
          if (isMounted) setError('Erro ao carregar matches: ' + matchesError);
          return;
        }
        if (userError) {
          if (isMounted) setError('Erro ao carregar perfil: ' + userError);
          return;
        }
        if (!match || !profile) {
          console.error('ChatWindow: Missing match or profile', { match, profile });
          if (isMounted) setError('Match ou perfil do usuário não encontrado');
          return;
        }

        if (match.conversation_id) {
          console.log('ChatWindow: Using existing conversation', { conversationId: match.conversation_id });
          if (isMounted) setConversationId(match.conversation_id);
          return;
        }

        // Verify match exists and is accessible
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('id, profile1_id, profile2_id')
          .eq('id', matchId)
          .single();

        if (matchError || !matchData) {
          console.error('ChatWindow: Match verification failed', { matchError, matchData });
          if (isMounted) setError('Match não encontrado ou acesso negado: ' + (matchError?.message || 'Sem dados'));
          return;
        }

        // Ensure user is part of the match
        const userProfileId = profile.id;
        if (matchData.profile1_id !== userProfileId && matchData.profile2_id !== userProfileId) {
          console.error('ChatWindow: User not part of match', { userProfileId, matchData });
          if (isMounted) setError('Você não tem acesso a este match');
          return;
        }

        // Check for existing conversation to avoid duplicates
        const { data: existingConversation, error: convCheckError } = await supabase
          .from('conversations')
          .select('id')
          .eq('match_id', matchId)
          .single();

        if (existingConversation) {
          console.log('ChatWindow: Found existing conversation', { conversationId: existingConversation.id });
          if (isMounted) setConversationId(existingConversation.id);
          return;
        }
        if (convCheckError && convCheckError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('ChatWindow: Error checking existing conversation', { convCheckError });
          if (isMounted) setError('Erro ao verificar conversa: ' + convCheckError.message);
          return;
        }

        // Create new conversation
        const { data, error } = await supabase
          .from('conversations')
          .insert({ match_id: matchId })
          .select('id')
          .single();

        if (error) {
          console.error('ChatWindow: Conversation creation failed', { error });
          if (isMounted) setError('Erro ao criar conversa: ' + error.message);
          return;
        }

        console.log('ChatWindow: Conversation created', { conversationId: data.id });
        if (isMounted) {
          setConversationId(data.id);
          refetch(); // Update matches with new conversation_id
        }
      } catch (err) {
        console.error('ChatWindow: initConversation error', err);
        if (isMounted) setError('Erro inesperado: ' + (err as Error).message);
      }
    };

    if (!matchesLoading && !userLoading) {
      initConversation();
    }

    return () => {
      isMounted = false;
    };
  }, [matchId, match, profile, refetch, matchesError, userError, matchesLoading, userLoading]);

  if (matchesLoading || userLoading) {
    return <div className="p-4">Carregando dados...</div>;
  }
  if (matchesError) {
    return <div className="p-4 text-red-500">Erro ao carregar matches: {matchesError}</div>;
  }
  if (userError) {
    return <div className="p-4 text-red-500">Erro ao carregar perfil: {userError}</div>;
  }
  if (!match || !profile) {
    return <div className="p-4 text-red-500">Carregando ou match não encontrado...</div>;
  }
  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }
  if (!conversationId) {
    return <div className="p-4">Carregando ou criando conversa...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center">
        <img
          src={match.other_avatar_url || '/placeholder.svg'}
          alt={match.other_name || 'Usuário'}
          className="w-10 h-10 rounded-full"
        />
        <h2 className="ml-3 font-semibold">{match.other_name || 'Usuário'}</h2>
      </div>
      <MessageList conversationId={conversationId} />
      <MessageInput conversationId={conversationId} senderId={profile.id} receiverId={match.other_profile_id} />
    </div>
  );
};