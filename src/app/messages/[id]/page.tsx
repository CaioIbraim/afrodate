"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Message {
  id: string
  content: string
  sender_id: string
  receiver_id: string
  created_at: string
  is_read: boolean
}

interface Profile {
  id: string
  name: string
  avatar_url?: string
}

export default function ChatPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [profile, setProfile] = useState<Profile | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Busca perfil do destinatário e mensagens
  useEffect(() => {
    const fetchData = async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .eq("id", params.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }

      const { data: userData } = await supabase.auth.getUser()
      setCurrentUserId(userData.user?.id || null)

      fetchMessages(userData.user?.id || "", params.id)
    }

    fetchData()
  }, [params.id])

  // Carrega mensagens iniciais
  const fetchMessages = async (userId: string, receiverId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true })

    if (error) return console.log(error)

    setMessages(data)

    // Marca mensagens não lidas como lidas
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", userId)
      .eq("sender_id", receiverId)
      .eq("is_read", false)
  }

  // Inscreve-se em atualizações em tempo real
  useEffect(() => {
    const channel = supabase
      .channel("realtime messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${currentUserId},sender_id=eq.${params.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, params.id])

  // Rola para o final ao carregar ou enviar nova mensagem
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Envia nova mensagem
  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId) return

    // Busca ou cria uma conversa
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${params.id}),and(user1_id.eq.${params.id},user2_id.eq.${currentUserId})`)
      .maybeSingle()

    let conversationId = conversation?.id

    if (!conversation) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          user1_id: currentUserId,
          user2_id: params.id,
        })
        .select()
        .single()

      conversationId = newConv?.id
    }

    // Envia a mensagem
    await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        receiver_id: params.id,
        content: newMessage.trim(),
      })

    setNewMessage("")
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Cabeçalho */}
      <header className="bg-white shadow-sm p-4 flex items-center">
        <Button variant="ghost" onClick={() => router.push("/messages")}>
          <ChevronLeft className="h-6 w-6 mr-2" />
        </Button>
        {profile ? (
          <div className="flex items-center gap-3">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.name} width={40} height={40} className="rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                {profile.name.charAt(0)}
              </div>
            )}
            <span className="font-semibold">{profile.name}</span>
          </div>
        ) : (
          <span>Carregando...</span>
        )}
      </header>

      {/* Área de mensagens */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 ${
                msg.sender_id === currentUserId
                  ? "ml-auto bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                  : "bg-white border shadow-sm"
              }`}
            >
              <p>{msg.content}</p>
              <small className={`text-xs block mt-1 ${msg.sender_id === currentUserId ? "text-indigo-100" : "text-gray-500"}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </small>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Campo de envio */}
      <div className="bg-white border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex gap-2"
        >
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim()}>
            Enviar
          </Button>
        </form>
      </div>
    </div>
  )
}