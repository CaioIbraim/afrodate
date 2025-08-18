import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Match {
  match_id: string;
  other_profile_id: string;
  other_name: string | null;
  other_avatar_url: string | null;
  conversation_id: string | null;
  last_message_at: string | null;
  sort_time: string;
}

export const useMatches = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('useMatches: auth.getUser', { user, authError });
      if (authError || !user) {
        setError('Usuário não autenticado');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc('get_user_matches', { p_user_id: user.id });
      console.log('useMatches: get_user_matches', { data, error });
      if (error) {
        setError('Erro ao buscar matches: ' + error.message);
      } else {
        setMatches(data || []);
        setError(null);
      }
    } catch (err) {
      console.error('useMatches: unexpected error', err);
      setError('Erro inesperado: ' + (err as Error).message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMatches();

    const matchSub = supabase
      .channel('matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        console.log('Matches subscription triggered');
        fetchMatches();
      })
      .subscribe();

    const conversationSub = supabase
      .channel('conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        console.log('Conversations subscription triggered');
        fetchMatches();
      })
      .subscribe();

    const messageSub = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        console.log('Messages subscription triggered');
        fetchMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(matchSub);
      supabase.removeChannel(conversationSub);
      supabase.removeChannel(messageSub);
    };
  }, []);

  return { matches, loading, error, refetch: fetchMatches };
};