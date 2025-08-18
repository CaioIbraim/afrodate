import { useEffect, useRef } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useUser } from '@/hooks/useUser';
import InfiniteScroll from 'react-infinite-scroll-component';

interface MessageListProps {
  conversationId: string;
}

export const MessageList = ({ conversationId }: MessageListProps) => {
  const { messages, loading, hasMore, loadMore, error } = useMessages(conversationId);
  const { profile } = useUser();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('MessageList: useEffect', { conversationId, messages, loading, hasMore, error });
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, conversationId]);

  if (!conversationId) {
    return <div className="p-4 text-red-500">Nenhuma conversa selecionada</div>;
  }
  if (!profile) {
    return <div className="p-4 text-red-500">Perfil do usuário não carregado</div>;
  }
  if (error) {
    return <div className="p-4 text-red-500">Erro ao carregar mensagens: {error}</div>;
  }
  if (loading) {
    return <div className="p-4">Carregando mensagens...</div>;
  }
  if (messages.length === 0 && !hasMore) {
    return <div className="p-4 text-gray-500">Nenhuma mensagem nesta conversa</div>;
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4" id="message-list">
      <InfiniteScroll
        dataLength={messages.length}
        next={loadMore}
        style={{ display: 'flex', flexDirection: 'column-reverse' }}
        inverse={true}
        hasMore={hasMore}
        loader={<h4 className="p-4">Carregando mais mensagens...</h4>}
        scrollableTarget="message-list"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-4 ${msg.sender_id === profile.id ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`inline-block p-2 rounded-lg ${
                msg.sender_id === profile.id ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              {msg.content}
            </div>
            <p className="text-xs text-gray-500">{new Date(msg.created_at).toLocaleString()}</p>
          </div>
        ))}
      </InfiniteScroll>
    </div>
  );
};