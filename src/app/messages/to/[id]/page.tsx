"use client"

import { useState, useRef, useEffect } from "react"
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
const emojiCategories = {
  recent: ["❤️", "😊", "👍", "✨", "🙏", "🔥", "💯", "🎉"],
  people: ["😊", "😍", "😂", "👋", "🤗", "👏", "🙌", "👑"],
  nature: ["🌍", "🌱", "🌺", "🌴", "🌞", "⭐", "🌈", "🦋"],
  symbols: ["❤️", "✨", "🔥", "💯", "💪", "✊", "☮️", "🕊️"],
  food: ["🍉", "🥭", "🍌", "🍗", "🍲", "🥘", "🍚", "🍹"],
}

// Definindo a interface para os parâmetros da página
interface PageParams {
  params: Promise<{ id: string }>
}

export default async function ChatPage({ params }: PageParams) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Resolver os parâmetros da página
  const resolvedParams = await params
  const recipientId = resolvedParams.id

  // IDs
  const userIdFromQuery = searchParams.get("userId") || searchParams.get("id")
  const [recipient, setRecipient] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [currentEmojiCategory, setCurrentEmojiCategory] = useState("recent")
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user, profile } = useUser()

  // Carregar perfil do destinatário
  useEffect(() => {
    const fetchRecipientProfile = async () => {
      if (!recipientId) return

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", recipientId)
          .single()

        if (error) throw error
        setRecipient(data)
      } catch (error) {
        console.error("Erro ao carregar perfil do destinatário:", error)
      }
    }

    fetchRecipientProfile()
  }, [recipientId])

  // Carregar mensagens
  useEffect(() => {
    const fetchMessages = async () => {
      if (!profile?.id || !recipientId) return

      try {
        setIsLoading(true)
        
        // Buscar conversa existente
        const { data: conversation, error: conversationError } = await supabase
          .from("conversations")
          .select("*")
          .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
          .or(`user1_id.eq.${recipientId},user2_id.eq.${recipientId}`)
          .single()

        if (conversationError && conversationError.code !== "PGRST116") {
          throw conversationError
        }

        let conversationId = conversation?.id

        // Se não existir conversa, criar uma nova
        if (!conversationId) {
          const { data: newConversation, error: newConversationError } = await supabase
            .from("conversations")
            .insert({
              user1_id: profile.id,
              user2_id: recipientId,
            })
            .select()
            .single()

          if (newConversationError) throw newConversationError
          conversationId = newConversation.id
        }

        // Buscar mensagens da conversa
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })

        if (messagesError) throw messagesError
        setMessages(messagesData || [])

        // Marcar mensagens como lidas
        if (messagesData && messagesData.length > 0) {
          const unreadMessages = messagesData.filter(
            (msg) => !msg.is_read && msg.sender_id !== profile.id
          )

          if (unreadMessages.length > 0) {
            const unreadIds = unreadMessages.map((msg) => msg.id)
            await supabase
              .from("messages")
              .update({ is_read: true })
              .in("id", unreadIds)
          }
        }

        // Inscrever-se para atualizações em tempo real
        const messagesSubscription = supabase
          .channel(`messages:${conversationId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `conversation_id=eq.${conversationId}`,
            },
            (payload) => {
              const newMessage = payload.new
              setMessages((current) => [...current, newMessage])

              // Marcar como lida se não for do usuário atual
              if (newMessage.sender_id !== profile.id) {
                supabase
                  .from("messages")
                  .update({ is_read: true })
                  .eq("id", newMessage.id)
              }
            }
          )
          .subscribe()

        return () => {
          supabase.removeChannel(messagesSubscription)
        }
      } catch (error) {
        console.error("Erro ao carregar mensagens:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessages()
  }, [profile?.id, recipientId])

  // Rolar para o final das mensagens quando novas mensagens são adicionadas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !profile?.id || !recipientId) return

    try {
      // Buscar conversa existente
      const { data: conversation, error: conversationError } = await supabase
        .from("conversations")
        .select("*")
        .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
        .or(`user1_id.eq.${recipientId},user2_id.eq.${recipientId}`)
        .single()

      if (conversationError && conversationError.code !== "PGRST116") {
        throw conversationError
      }

      let conversationId = conversation?.id

      // Se não existir conversa, criar uma nova
      if (!conversationId) {
        const { data: newConversation, error: newConversationError } = await supabase
          .from("conversations")
          .insert({
            user1_id: profile.id,
            user2_id: recipientId,
          })
          .select()
          .single()

        if (newConversationError) throw newConversationError
        conversationId = newConversation.id
      }

      // Enviar mensagem
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        receiver_id: recipientId,
        content: newMessage,
      })

      setNewMessage("")
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const addEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji)
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getInitials = (name: string) => {
    return name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .substring(0, 2)
      : "??"
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/messages")}
          className="mr-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {recipient ? (
          <div className="flex items-center">
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage src={recipient.avatar_url} alt={recipient.name} />
              <AvatarFallback>{getInitials(recipient.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">{recipient.name}</h2>
              <p className="text-xs text-muted-foreground">
                {recipient.online ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse mr-3"></div>
            <div>
              <div className="h-4 w-24 bg-muted animate-pulse rounded mb-1"></div>
              <div className="h-3 w-16 bg-muted animate-pulse rounded"></div>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex flex-col space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`rounded-lg p-3 max-w-[80%] ${i % 2 === 0 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  <div className="h-4 w-32 bg-muted-foreground/20 animate-pulse rounded mb-1"></div>
                  <div className="h-3 w-16 bg-muted-foreground/20 animate-pulse rounded self-end"></div>
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p>Nenhuma mensagem ainda.</p>
            <p className="text-sm">Seja o primeiro a dizer olá!</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === profile.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`rounded-lg p-3 max-w-[80%] ${message.sender_id === profile.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${message.sender_id === profile.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                  >
                    {formatTime(message.created_at)}
                    {message.is_read && message.sender_id === profile.id && (
                      <span className="ml-1">✓</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-full max-w-[340px] p-0"
              side="top"
              align="start"
            >
              <Tabs
                defaultValue="recent"
                onValueChange={setCurrentEmojiCategory}
                className="w-full"
              >
                <TabsList className="w-full justify-start border-b rounded-none">
                  <TabsTrigger value="recent" className="flex-1">
                    Recentes
                  </TabsTrigger>
                  <TabsTrigger value="people" className="flex-1">
                    Pessoas
                  </TabsTrigger>
                  <TabsTrigger value="nature" className="flex-1">
                    Natureza
                  </TabsTrigger>
                  <TabsTrigger value="symbols" className="flex-1">
                    Símbolos
                  </TabsTrigger>
                  <TabsTrigger value="food" className="flex-1">
                    Comida
                  </TabsTrigger>
                </TabsList>
                <div className="p-4 grid grid-cols-8 gap-2">
                  {emojiCategories[currentEmojiCategory as keyof typeof emojiCategories].map(
                    (emoji) => (
                      <button
                        key={emoji}
                        className="text-2xl hover:bg-muted rounded p-1 cursor-pointer"
                        onClick={() => addEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    )
                  )}
                </div>
              </Tabs>
            </PopoverContent>
          </Popover>

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="flex-1"
          />

          <Button
            onClick={handleSendMessage}
            size="icon"
            disabled={!newMessage.trim()}
            className="shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}