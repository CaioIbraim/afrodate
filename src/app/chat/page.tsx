'use client';
import { useState } from 'react';
import { ChatLayout } from '@/components/chat/ChatLayout';

export default function ChatPage() {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const handleSelectMatch = (matchId: string, conversationId: string | null) => {
    setSelectedMatchId(matchId);
    setSelectedConversationId(conversationId);
  };

  return <ChatLayout selectedMatchId={selectedMatchId} onSelectMatch={handleSelectMatch} />;
}