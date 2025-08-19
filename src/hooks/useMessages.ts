import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

const PAGE_SIZE = 25;
const POLLING_INTERVAL = 3000; // 3 seconds

export const useMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const page = useRef(0);

  const fetchMessages = async (loadMore = false) => {
    if (!conversationId) {
      console.log('useMessages: No conversationId provided');
      setError('Nenhum ID de conversa fornecido');
      setLoading(false);
      return;
    }

    setLoading(true);
    const from = loadMore ? messages.length : 0;
    const to = from + PAGE_SIZE - 1;

    console.log('useMessages: Fetching messages', { conversationId, from, to });
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) {
      console.error('useMessages: Error fetching messages', { error });
      setError('Erro ao buscar mensagens: ' + error.message);
    } else {
      console.log('useMessages: Messages fetched', { data });
      if (loadMore) {
        setMessages((prev) => {
          const newMessages = data.reverse().filter((msg) => !prev.some((m) => m.id === msg.id));
          return [...newMessages, ...prev];
        });
      } else {
        setMessages(data ? data.reverse() : []);
      }
      setHasMore(data && data.length === PAGE_SIZE);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (conversationId) {
      console.log('useMessages: Resetting messages for new conversationId', { conversationId });
      setMessages([]);
      page.current = 0;
      fetchMessages();
    }
  }, [conversationId]);

  // Polling effect
  useEffect(() => {
    if (!conversationId) {
      console.log('useMessages: No conversationId, skipping polling');
      return;
    }

    console.log('useMessages: Starting polling', { conversationId });
    const intervalId = setInterval(() => {
      console.log('useMessages: Polling messages', { conversationId });
      fetchMessages();
    }, POLLING_INTERVAL);

    return () => {
      console.log('useMessages: Stopping polling', { conversationId });
      clearInterval(intervalId);
    };
  }, [conversationId]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) {
      console.log('useMessages: No conversationId, skipping subscription');
      return;
    }

    console.log('useMessages: Setting up subscription', { conversationId });
    const channel = supabase
      .channel(`messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('useMessages: New message received', { payload });
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === payload.new.id)) {
              return prev;
            }
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe((status, err) => {
        console.log('useMessages: Subscription status', { status, err });
        if (err) {
          setError('Erro na assinatura de mensagens: ' + err.message);
        }
        if (status === 'SUBSCRIBED') {
          console.log('useMessages: Subscription active', { conversationId });
        }
      });

    return () => {
      console.log('useMessages: Unsubscribing from messages', { conversationId });
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const loadMore = () => {
    if (hasMore && !loading) {
      console.log('useMessages: Loading more messages');
      fetchMessages(true);
    }
  };

  const sendMessage = async (content: string, senderId: string, receiverId: string) => {
    if (!conversationId) {
      console.error('useMessages: Cannot send message, no conversationId');
      setError('Nenhum ID de conversa fornecido');
      return;
    }

    const optimisticMessage: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    console.log('useMessages: Sending message', { optimisticMessage });
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        receiver_id: receiverId,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('useMessages: Error sending message', { error });
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
      setError('Erro ao enviar mensagem: ' + error.message);
    } else {
      console.log('useMessages: Message sent successfully', { data });
      setMessages((prev) =>
        prev.map((msg) => (msg.id === optimisticMessage.id ? (data as Message) : msg))
      );
    }
  };

  return { messages, loading, hasMore, loadMore, sendMessage, error };
};