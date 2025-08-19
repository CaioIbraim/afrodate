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
  const shouldScrollToBottom = useRef(true);

  useEffect(() => {
    console.log('MessageList: useEffect', { conversationId, messages, loading, hasMore, error });
    if (scrollRef.current && shouldScrollToBottom.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        shouldScrollToBottom.current = scrollHeight - scrollTop - clientHeight < 50;
      };
      scrollRef.current.addEventListener('scroll', handleScroll);
      return () => scrollRef.current?.removeEventListener('scroll', handleScroll);
    }
  }, []);

  if (!conversationId) {
    return <div className="p-3 sm:p-4 text-center text-red-500 text-sm sm:text-base">Nenhuma conversa selecionada</div>;
  }
  if (!profile) {
    return <div className="p-3 sm:p-4 text-center text-red-500 text-sm sm:text-base">Perfil do usuário não carregado</div>;
  }
  if (error) {
    return <div className="p-3 sm:p-4 text-center text-red-500 text-sm sm:text-base">Erro ao carregar mensagens: {error}</div>;
  }
  if (loading && messages.length === 0) {
    return <div className="p-3 sm:p-4 text-center text-gray-500 text-sm sm:text-base">Carregando mensagens...</div>;
  }
  if (messages.length === 0 && !hasMore) {
    return <div className="p-3 sm:p-4 text-center text-gray-500 text-sm sm:text-base">Nenhuma mensagem nesta conversa</div>;
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50"
      id="message-list"
    >
      <InfiniteScroll
        dataLength={messages.length}
        next={loadMore}
        style={{ display: 'flex', flexDirection: 'column-reverse' }}
        inverse={true}
        hasMore={hasMore}
        loader={<h4 className="p-3 sm:p-4 text-center text-gray-500 text-sm sm:text-base">Carregando mais mensagens...</h4>}
        scrollableTarget="message-list"
      >




        {messages.reverse().map((msg) => (
          <div
            key={msg.id}
            className={`mb-3 sm:mb-4 flex ${msg.sender_id === profile.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] sm:max-w-[60%] p-2 sm:p-3 rounded-lg text-sm sm:text-base ${
                msg.sender_id === profile.id ? 'bg-blue-500 text-white' : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              {msg.content}
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </InfiniteScroll>
    </div>
  );
};