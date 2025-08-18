// app/chat/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { supabase } from '@/lib/supabase';

export default function ChatPage() {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setIsAuthenticated(true);
      }
    };
    checkAuth();
  }, [router]);

  if (!isAuthenticated) return <div>Verificando autenticação...</div>;

  const handleSelectMatch = (matchId: string, conversationId: string | null) => {
    setSelectedMatchId(matchId);
  };

  return (
    <ChatLayout
      selectedMatchId={selectedMatchId}
      onSelectMatch={handleSelectMatch}
    />
  );
}