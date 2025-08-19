import { useEffect, useState } from 'react';
import { useMatches } from '@/hooks/useMatches';
import { useUser } from '@/hooks/useUser';
import { MessageList } from './MessageList';
import  MessageInput  from './MessageInput';
import { supabase } from '@/lib/supabase';

// Define interfaces for type safety
interface Match {
  match_id: string;
  other_profile_id: string;
  other_name: string | null;
  other_avatar_url: string | null;
  conversation_id: string | null;
}

interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
}

interface ChatWindowProps {
  matchId: string;
}

export const ChatWindow = ({ matchId }: ChatWindowProps) => {
  const { matches, refetch, error: matchesError, loading: matchesLoading } = useMatches();
  const { profile, error: userError, loading: userLoading } = useUser();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const match = matches.find((m: Match) => m.match_id === matchId);

  useEffect(() => {
    console.log('ChatWindow: useEffect', {
      matchId,
      match,
      profile,
      matchesError,
      userError,
      matchesLoading,
      userLoading,
      matchesLength: matches.length,
    });
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
          console.log('ChatWindow: Using existing conversation from match', { conversationId: match.conversation_id });
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

        // Check for existing conversation with retry logic
        let existingConversation = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          console.log('ChatWindow: Checking for existing conversation', { attempt, matchId });
          const { data, error: convCheckError } = await supabase
            .from('conversations')
            .select('id')
            .eq('match_id', matchId)
            .maybeSingle();

          if (convCheckError && convCheckError.code !== 'PGRST116') {
            console.error('ChatWindow: Error checking existing conversation', { attempt, convCheckError });
            if (attempt === 3) {
              if (isMounted) setError('Erro ao verificar conversa: ' + convCheckError.message);
              return;
            }
            await new Promise((resolve) => setTimeout(resolve, 500)); // Wait before retry
            continue;
          }

          existingConversation = data;
          break;
        }

        if (existingConversation) {
          console.log('ChatWindow: Found existing conversation', { conversationId: existingConversation.id });
          if (isMounted) setConversationId(existingConversation.id);
          return;
        }

        // Create new conversation
        console.log('ChatWindow: Attempting to create new conversation', { matchId });
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
          refetch();
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

  // Early return for all error and loading states
  if (matchesLoading || userLoading) {
    return <div className="p-3 sm:p-4 text-center text-gray-500 text-sm sm:text-base">Carregando dados...</div>;
  }
  if (matchesError) {
    return <div className="p-3 sm:p-4 text-center text-red-500 text-sm sm:text-base">Erro ao carregar matches: {matchesError}</div>;
  }
  if (userError) {
    return <div className="p-3 sm:p-4 text-center text-red-500 text-sm sm:text-base">Erro ao carregar perfil: {userError}</div>;
  }
  if (!match) {
    console.error('ChatWindow: No match found for matchId', { matchId, matches });
    return <div className="p-3 sm:p-4 text-center text-red-500 text-sm sm:text-base">Match não encontrado</div>;
  }
  if (!profile) {
    console.error('ChatWindow: No profile available');
    return <div className="p-3 sm:p-4 text-center text-red-500 text-sm sm:text-base">Perfil do usuário não encontrado</div>;
  }
  if (error) {
    return <div className="p-3 sm:p-4 text-center text-red-500 text-sm sm:text-base">{error}</div>;
  }
  if (!conversationId) {
    return <div className="p-3 sm:p-4 text-center text-gray-500 text-sm sm:text-base">Carregando ou criando conversa...</div>;
  }

  // Additional validation for match properties
  if (!match.other_profile_id || !profile.id) {
    console.error('ChatWindow: Invalid match or profile data', { match, profile });
    return <div className="p-3 sm:p-4 text-center text-red-500 text-sm sm:text-base">Dados de match ou perfil inválidos</div>;
  }

  return (
    <div className="flex flex-col w-full h-[calc(100vh-4rem)] max-w-3xl mx-auto">
      <div className="flex items-center p-3 sm:p-4 border-b bg-white shrink-0">
        <img
          src={match.other_avatar_url ?? '/placeholder.svg'}
          alt={match.other_name ?? 'Usuário'}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
        />
        <h2 className="ml-2 sm:ml-3 text-base sm:text-lg font-semibold truncate">
          {match.other_name ?? 'Usuário'}
        </h2>
      </div>
      <MessageList conversationId={conversationId} />
      <MessageInput
        conversationId={conversationId}
        senderId={profile.id}
        receiverId={match.other_profile_id}
      />
    </div>
  );
};