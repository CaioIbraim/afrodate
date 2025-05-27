"use client"

import { useState, useRef, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Send, Smile } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/hooks/use-user"

// Emojis relacionados à cultura afro e diversidade
const emojiSets = {
  recent: ["❤️", "👍", "😊", "✨", "🙏🏾", "🔥", "💯", "🎵"],
  culture: ["🥁", "🎭", "🎨", "🎵", "🎶", "🎺", " saxofone", "🎹", "🎤", "🎬", "📚", "🍲"],
  people: ["👋🏾", "👋🏽", "👋🏿", "✊🏾", "✊🏽", "✊🏿", "👏🏾", "👏🏽", "👏🏿", "🙌🏾", "🙌🏽", "🙌🏿"],
  nature: ["🌍", "🌱", "🌿", "🍃", "🌺", "🌻", "🌼", "🌸", "🌴", "🌵", "🌊", "☀️"],
  symbols: ["♥️", "✨", "⭐", "🔥", "💫", "💥", "💢", "💯", "💕", "💞", "💓", "💗"],
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()

  // IDs
  const userIdFromQuery = searchParams.get("userId") || searchParams.get("id")
  const [recipient, setRecipient] = useState<any>(null)
  const [conversation, setConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState("recent")
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { profile } = useUser()
  const currentUserId = profile?.id || null

  // Carrega ou cria conversa
  useEffect(() => {
    const loadOrCreateMatchAndConversation = async () => {
      if (!userIdFromQuery || !currentUserId) return

      // Busca destinatário pelo ID direto
      const { data: recipientData, error: recipientError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userIdFromQuery)
        .single()

      if (recipientError) {
        console.error("Erro ao carregar perfil do destinatário:", recipientError)
        setRecipient(null)
        setLoading(false)
        return
      }

      setRecipient(recipientData)

      // Verifica se já existe um match entre os perfis
      let existingMatch = await getExistingMatch(currentUserId, recipientData.id)
      if (!existingMatch) {
        existingMatch = await createMatch(currentUserId, recipientData.id)
      }

      // Verifica ou cria conversa
      let conversationData = await getConversation(existingMatch.id)
      if (!conversationData) {
        conversationData = await createConversation(existingMatch.id)
      }

      setConversation(conversationData)
      await loadMessages(conversationData.id)

      // Marcar mensagens não lidas como lidas
      await markMessagesAsRead(recipientData.id, currentUserId)
      setLoading(false)
    }

    loadOrCreateMatchAndConversation()
  }, [userIdFromQuery, currentUserId])

  // Carregar mensagens
  const loadMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })

    if (!error && data) {
      setMessages(data)
    }
  }

  // Marcar mensagens como lidas
  const markMessagesAsRead = async (senderId: string, receiverId: string) => {
    if (!senderId || !receiverId) return

    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", receiverId)
      .eq("sender_id", senderId)
      .eq("is_read", false)
  }

  // Assinatura em tempo real
  useEffect(() => {
    if (!conversation?.id || !currentUserId) return

    const channel = supabase
      .channel(`realtime-messages-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMessage = payload.new as any
          setMessages((prev) => [...prev, newMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversation?.id, currentUserId])

  // Rolagem automática
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Funções auxiliares

  const getExistingMatch = async (profile1: string, profile2: string) => {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .or(`and(profile1_id.eq.${profile1},profile2_id.eq.${profile2}),and(profile1_id.eq.${profile2},profile2_id.eq.${profile1})`)
      .maybeSingle()

    if (error) {
      console.error("Erro ao buscar match:", error)
      return null
    }

    return data
  }

  const createMatch = async (profile1: string, profile2: string) => {
    const { data, error } = await supabase
      .from("matches")
      .insert({
        profile1_id: profile1,
        profile2_id: profile2,
      })
      .select("*")
      .single()

    if (error) {
      console.error("Erro ao criar match:", error)
      return null
    }

    return data
  }

  const getConversation = async (matchId: string) => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("match_id", matchId)
      .maybeSingle()

    if (error) {
      console.error("Erro ao buscar conversa:", error)
      return null
    }

    return data
  }

  const createConversation = async (matchId: string) => {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ match_id: matchId })
      .select("*")
      .single()

    if (error) {
      console.error("Erro ao criar conversa:", error)
      return null
    }

    return data
  }

  // Enviar mensagem
  const sendMessage = async () => {
    if (!newMessage.trim() || !conversation?.id || !recipient || !currentUserId) return

    await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        sender_id: currentUserId,
        receiver_id: recipient.id,
        content: newMessage.trim(),
        status: "sent",
      })

    setNewMessage("")
    setShowEmojiPicker(false)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    )
  }

  if (!recipient) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p>Destinatário não encontrado</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto">
      {/* Cabeçalho */}
      <header className="bg-white border-b border-gray-200 p-4 flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </Button>
        <Avatar className="h-10 w-10 ml-2">
          <AvatarImage src={recipient.avatar_url} alt={recipient.name} />
          <AvatarFallback>{recipient.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className="ml-3 font-medium">{recipient.name}</span>
      </header>

      {/* Área de mensagens */}
      <ScrollArea className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}>
              {msg.sender_id !== currentUserId && (
                <Avatar className="h-8 w-8 mr-2 mt-1">
                  <AvatarImage src={recipient.avatar_url} alt={recipient.name} />
                  <AvatarFallback>{recipient.name.charAt(0)}</AvatarFallback>
                </Avatar>
              )}

              <div
                className={`max-w-[70%] p-3 rounded-2xl ${
                  msg.sender_id === currentUserId
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <p>{msg.content}</p>
                <small
                  className={`text-xs block mt-1 ${
                    msg.sender_id === currentUserId ? "text-indigo-100 text-right" : "text-gray-500"
                  }`}
                >
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {msg.sender_id === currentUserId && (
                    <span className="ml-1">{msg.is_read ? "✓✓" : "✓"}</span>
                  )}
                </small>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Campo de envio */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-oraculo-muted">
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 z-50">
              <div className="p-2">
                <Tabs defaultValue="recent" onValueChange={setEmojiCategory}>
                  <TabsList className="grid grid-cols-5 h-9">
                    <TabsTrigger value="recent">🕒</TabsTrigger>
                    <TabsTrigger value="culture">🎭</TabsTrigger>
                    <TabsTrigger value="people">👋🏾</TabsTrigger>
                    <TabsTrigger value="nature">🌍</TabsTrigger>
                    <TabsTrigger value="symbols">♥️</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="grid grid-cols-8 gap-1 mt-2">
                  {emojiSets[emojiCategory as keyof typeof emojiSets].map((emoji, index) => (
                    <button
                      key={index}
                      className="text-xl p-1 hover:bg-gray-100 rounded"
                      onClick={() => handleEmojiSelect(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Input
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 mx-2 bg-gray-100 border-0"
          />

          <Button variant="ghost" size="icon" onClick={sendMessage}>
            <Send className="h-5 w-5 text-oraculo-purple" />
          </Button>
        </div>
      </div>
    </div>
  )

  function handleEmojiSelect(emoji: string) {
    setNewMessage((prev) => prev + emoji)
  }
}