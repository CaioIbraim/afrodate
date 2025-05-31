"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Send, Smile } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/hooks/use-user"

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
}

interface Profile {
  id: string
  name: string
  avatar_url: string
}

// Definindo a interface para os parâmetros da página
interface PageParams {
  params: Promise<{ id: string }>
}

export default async function ChatPage({ params }: PageParams) {
  const router = useRouter()
  const [recipient, setRecipient] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { profile } = useUser()

  // Resolver os parâmetros da página
  const resolvedParams = await params
  const recipientId = resolvedParams.id

  // Buscar perfil do destinatário e mensagens
  useEffect(() => {
    const fetchRecipientProfile = async () => {
      if (!profile) return

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", recipientId)
          .single()

        if (error) throw error
        setRecipient(data as Profile)

        // Buscar mensagens após obter o perfil
        fetchMessages()
      } catch (error) {
        console.error("Erro ao buscar perfil:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecipientProfile()
  }, [profile, recipientId])

  const fetchMessages = async () => {
    if (!profile || !recipientId) return

    try {
      // Buscar mensagens entre os dois usuários
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${profile.id},receiver_id.eq.${recipientId}),` +
            `and(sender_id.eq.${recipientId},receiver_id.eq.${profile.id})`
        )
        .order("created_at")

      if (error) throw error
      setMessages(data as Message[])

      // Marcar mensagens como lidas
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("receiver_id", profile.id)
        .eq("sender_id", recipientId)
        .eq("is_read", false)
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !profile || !recipient) return

    const newMsg: Omit<Message, "id" | "created_at"> = {
      conversation_id: `${profile.id}_${recipient.id}`,
      sender_id: profile.id,
      receiver_id: recipient.id,
      content: newMessage.trim(),
      is_read: false,
    }

    try {
      const { error } = await supabase.from("messages").insert(newMsg)
      if (error) throw error
      setNewMessage("")
      fetchMessages()
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
    }
  }

  // Rolar para o final das mensagens quando novas mensagens são adicionadas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Inscrever-se para atualizações em tempo real
  useEffect(() => {
    if (!profile || !recipientId) return

    const channel = supabase
      .channel(`messages_${profile.id}_${recipientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `or(and(sender_id.eq.${profile.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${profile.id}))`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages((current) => [...current, newMessage])

          // Marcar como lida se for destinatário
          if (newMessage.receiver_id === profile.id) {
            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", newMessage.id)
              .then()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile, recipientId])

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-12 w-12 rounded-full border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Cabeçalho */}
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
              <AvatarFallback>
                {recipient.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">{recipient.name}</h2>
              <p className="text-xs text-muted-foreground">
                {/* Status do usuário */}
                Online
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

      {/* Mensagens */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
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
                    {new Date(message.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
        <form onSubmit={sendMessage} className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0" type="button">
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-full max-w-[340px] p-0"
              side="top"
              align="start"
            >
              <Tabs defaultValue="recent" className="w-full">
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
                  {/* Emojis aqui */}
                  {["😊", "😍", "😂", "❤️", "👍", "🔥", "✨", "🙏"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="text-2xl hover:bg-muted rounded p-1 cursor-pointer"
                      onClick={() => setNewMessage((prev) => prev + emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </Tabs>
            </PopoverContent>
          </Popover>

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1"
          />

          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim()}
            className="shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  )
}