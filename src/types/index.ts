// types/index.ts

// Perfil de um usuário, como está na sua tabela 'profiles'
export interface Profile {
    id: string;
    name: string;
    avatar_url: string | null;
    // Adicione outros campos do perfil que você possa ter
  }
  
  // Representa uma única mensagem
  export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    status: 'sending' | 'sent' | 'read' | 'failed'; // Status mais robusto
    is_read: boolean;
    created_at: string;
  }
  
  // Representa uma conversa na lista da esquerda.
  // Movido de useConversations para cá para ser reutilizável.
  export interface Conversation {
    id: string; // ID da conversa
    match_id: string;
    last_message_at: string;
    participant: Profile; // O perfil do outro usuário no match
  }