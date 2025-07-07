"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Send, Smile, MoreVertical, Phone, Video } from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { motion } from "framer-motion"
import { PremiumBadge } from "@/components/ui/premium-badge"
import { FeatureLock } from "@/components/ui/feature-lock"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"

// Emojis relacionados à cultura afro e diversidade
const emojiSets = {
  recent: ["❤️", "👍", "😊", "✨", "🙏🏾", "🔥", "💯", "🎵"],
  culture: ["🥁", "🎭", "🎨", "🎵", "🎶", "🎺", "🎷", "🎹", "🎤", "🎬", "📚", "🍲"],
  people: ["👋🏾", "👋🏽", "👋🏿", "✊🏾", "✊🏽", "✊🏿", "👏🏾", "👏🏽", "👏🏿", "🙌🏾", "🙌🏽", "🙌🏿"],
  nature: ["🌍", "🌱", "🌿", "🍃", "🌺", "🌻", "🌼", "🌸", "🌴", "🌵", "🌊", "☀️"],
  symbols: ["♥️", "✨", "⭐", "🔥", "💫", "💥", "💢", "💯", "💕", "💞", "💓", "💗"],
}

export default function MessagesPage() {
  const router = useRouter()
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState("recent")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [conversations, setConversations] = useState<Map<string, any>>(new Map())
  const [messages, setMessages] = useState<any[]>([])
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Carrega usuário atual
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        setCurrentUserId(data.user.id)
      }
    }

    loadUser()
  }, [])

  // Carrega matches e conversas
  useEffect(() => {
    const loadMatchesAndConversations = async () => {
      if (!currentUserId) return

      // Carrega todos os matches do usuário
      const { data: matchesData } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)

      if (!matchesData || matchesData.length === 0) {
        setMatches([])
        return
      }

      setMatches(matchesData)

      // Carrega conversas vinculadas aos matches
      const matchIds = matchesData.map((m: any) => m.id)
      const { data: convsData } = await supabase
        .from("conversations")
        .select("*")
        .in("match_id", matchIds)

      const convMap = new Map(convsData?.map((c: any) => [c.match_id, c]) || [])
      setConversations(convMap)

      // Se houver matches sem conversa, criar automaticamente
      for (const match of matchesData) {
        if (!convMap.has(match.id)) {
          const { data: newConv } = await supabase
            .from("conversations")
            .insert({
              match_id: match.id,
            })
            .select()
            .single()

          convMap.set(newConv.match_id, newConv)
        }
      }

      setConversations(convMap)

      // Definir a primeira conversa como ativa
      if (matchesData.length > 0 && !activeConversation) {
        const firstMatchId = matchesData[0].id
        setActiveConversation(firstMatchId)
        loadMessages(convMap.get(firstMatchId)?.id)
      }
    }

    loadMatchesAndConversations()
  }, [currentUserId])

  // Carrega mensagens da conversa ativa
  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (!error) {
      setMessages(data || [])
    }
  }

  // Assinatura em tempo real para receber novas mensagens
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel("realtime messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const msg = payload.new as any
          setConversations((prev) => {
            const newMap = new Map(prev)
            const conv = newMap.get(msg.conversation_id)
            if (conv) {
              newMap.set(msg.conversation_id, {
                ...conv,
                last_message_at: new Date(),
              })
            }
            return newMap
          })

          if (activeConversation !== null && conversations.get(activeConversation)?.id === msg.conversation_id) {
            setMessages((prev) => [...prev, msg])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, activeConversation, conversations])

  // Rolar para última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Envia nova mensagem
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !activeConversation) return

    const matchId = activeConversation
    const conversation = Array.from(conversations.entries()).find(([k, v]) => k === matchId)?.[1]

    if (!conversation) return

    const receiverId = matches.find((m) => m.id === matchId)?.user1_id === currentUserId
      ? matches.find((m) => m.id === matchId)?.user2_id
      : matches.find((m) => m.id === matchId)?.user1_id

    if (!receiverId) return

    await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: newMessage.trim(),
        status: "sent",
      })

    setNewMessage("")
    setShowEmojiPicker(false)
  }

  // Seleciona uma conversa
  const handleOpenConversation = (matchId: string) => {
    setActiveConversation(matchId)
    const conversation = conversations.get(matchId)
    if (conversation) {
      loadMessages(conversation.id)
    }
  }

  const handleBackToMatches = () => {
    router.push("/matches")
  }

  const handleUpgrade = () => {
    router.push("/subscription")
  }

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji)
  }

  // Busca perfil do destinatário
  const getRecipientProfile = (matchId: string) => {
    const match = matches.find((m) => m.id === matchId)
    if (!match) return null

    const recipientId =
      match.user1_id === currentUserId ? match.user2_id : match.user1_id

    return {
      id: recipientId,
      name: `Usuário ${recipientId.slice(0, 4)}...`,
      avatar_url: "/images/default-profile.png",
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Cabeçalho */}
      <div className="border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" className="text-oraculo-muted" onClick={handleBackToMatches}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Logo size="sm" />
          <Button
            variant="outline"
            size="sm"
            className="text-[#00FFD1] border-[#00FFD1]/30 hover:bg-[#00FFD1]/10"
            onClick={handleUpgrade}
          >
            Upgrade
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden max-w-md mx-auto w-full">
        {/* Lista de conversas */}
        <div className={`w-full ${activeConversation ? "hidden md:block md:w-1/3" : "block"} border-r border-gray-200`}>
          <div className="p-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold gradient-text">Mensagens</h2>
          </div>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            {matches.map((match) => {
              const recipientId =
                match.user1_id === currentUserId ? match.user2_id : match.user1_id
              const recipientName = `Usuário ${recipientId.slice(0, 4)}...`
              const unread = 0 // Implementar contagem real de mensagens não lidas
              const profile = getRecipientProfile(match.id)

              return (
                <div
                  key={match.id}
                  className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    activeConversation === match.id ? "bg-[#00FFD1]/5 border-l-4 border-[#00FFD1]" : ""
                  }`}
                  onClick={() => handleOpenConversation(match.id)}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 border border-gray-200">
                      <AvatarImage src={profile?.avatar_url} alt={profile?.name} />
                      <AvatarFallback>{profile?.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="ml-3 flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-oraculo-dark">{recipientName}</h3>
                    </div>
                    <p className="text-sm text-oraculo-muted truncate">Escreva sua primeira mensagem...</p>
                  </div>
                </div>
              )
            })}
          </ScrollArea>
        </div>

        {/* Área de conversa */}
        <div className={`flex-1 flex flex-col ${activeConversation ? "block" : "hidden md:block"}`}>
          {activeConversation && (
            <>
              {/* Cabeçalho da conversa */}
              <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-oraculo-muted md:hidden mr-2"
                    onClick={() => setActiveConversation(null)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={getRecipientProfile(activeConversation)?.avatar_url || "/images/default-profile.png"}
                      alt="Profile"
                    />
                    <AvatarFallback>
                      {getRecipientProfile(activeConversation)?.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    <h3 className="font-medium text-oraculo-dark">
                      {getRecipientProfile(activeConversation)?.name}
                    </h3>
                    <p className="text-xs text-oraculo-muted">Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-oraculo-muted"
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-oraculo-muted"
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    <Video className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Mensagens */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}>
                      {msg.sender_id !== currentUserId && (
                        <Avatar className="h-8 w-8 mr-2 mt-1">
                          <AvatarImage src={getRecipientProfile(activeConversation)?.avatar_url} />
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[70%] p-3 rounded-2xl ${
                          msg.sender_id === currentUserId
                            ? "bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white"
                            : "bg-gray-100 text-oraculo-dark"
                        }`}
                      >
                        <p>{msg.content}</p>
                        <div
                          className={`text-xs mt-1 flex items-center ${
                            msg.sender_id === currentUserId ? "text-white/70 justify-end" : "text-oraculo-muted"
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {msg.sender_id === currentUserId && (
                            <span className="ml-1">{msg.is_read ? "✓✓" : "✓"}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Campo de envio */}
              <div className="p-3 border-t border-gray-200">
                <div className="flex items-center">
                  <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-oraculo-muted">
                        <Smile className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0">
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
                    type="text"
                    placeholder="Digite uma mensagem..."
                    className="flex-1 mx-2 bg-gray-100 border-0"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendMessage()
                    }}
                  />
                  <Button variant="ghost" size="icon" className="text-[#00FFD1]" onClick={handleSendMessage}>
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de upgrade */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full"
          >
            <FeatureLock message="Recursos avançados de mensagens como envio de mídia, chamadas de voz e vídeo estão disponíveis apenas para usuários Premium. Faça upgrade agora para desbloquear." />
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowUpgradeModal(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 gradient-button" onClick={handleUpgrade}>
                Fazer Upgrade
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}