import { useState } from 'react';
import { useMessages } from '@/hooks/useMessages';

interface MessageInputProps {
  conversationId: string;
  senderId: string;
  receiverId: string;
}

export default function MessageInput({ conversationId, senderId, receiverId }: MessageInputProps) {
  const { sendMessage } = useMessages(conversationId);
  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      await sendMessage(content, senderId, receiverId);
      setContent('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center p-3 sm:p-4 bg-white border-t shrink-0"
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Digite sua mensagem..."
        className="flex-1 p-2 sm:p-3 text-sm sm:text-base border rounded-lg resize-none h-10 sm:h-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="ml-2 sm:ml-3 px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-lg text-sm sm:text-base hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        disabled={!content.trim()}
      >
        Enviar
      </button>
    </form>
  );
}