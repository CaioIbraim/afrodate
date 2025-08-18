import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Conversation {
  conversation_id: string;
  match_id: string;
  other_profile_id: string;
  other_name: string;
  other_avatar_url: string;
  last_message_at: string;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // hooks/useConversations.ts
const fetchConversations = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  console.log('fetchConversations', { user });
  if (user) {
    const { data, error } = await supabase.rpc('get_user_conversations', { p_user_id: user.id });
    console.log('Conversations fetched', { data, error });
    if (!error) {
      setConversations(data);
    }
  }
  setLoading(false);
};

  useEffect(() => {
    fetchConversations();

    const conversationSub = supabase
      .channel('conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => fetchConversations())
      .subscribe();

    const messageSub = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchConversations())
      .subscribe();

    return () => {
      supabase.removeChannel(conversationSub);
      supabase.removeChannel(messageSub);
    };
  }, []);

  return { conversations, loading };
};