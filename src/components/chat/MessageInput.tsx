import { useState } from 'react';
import { useMessages } from '@/hooks/useMessages';

interface MessageInputProps {
  conversationId: string;
  senderId: string;
  receiverId: string;
}

export const MessageInput = ({ conversationId, senderId, receiverId }: MessageInputProps) => {
  const [content, setContent] = useState('');
  const { sendMessage } = useMessages(conversationId);

  const handleSend = () => {
    if (content.trim()) {
      sendMessage(content, senderId, receiverId);
      setContent('');
    }
  };

  return (
    <div className="p-4 border-t flex">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 border rounded-l-lg p-2"
        placeholder="Digite sua mensagem..."
      />
      <button onClick={handleSend} className="bg-blue-500 text-white px-4 rounded-r-lg">
        Enviar
      </button>
    </div>
  );
};