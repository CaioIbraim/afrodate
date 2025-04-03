"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Send, ImageIcon, Smile, Paperclip, MoreVertical, Phone, Video, Heart } from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { motion } from "framer-motion"
import { PremiumBadge } from "@/components/ui/premium-badge"
import { FeatureLock } from "@/components/ui/feature-lock"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

// Dados simulados de conversas
const conversations = [
  {
    id: 1,
    user: {
      id: 1,
      name: "Ana",
      photo: "/images/female-profile.png",
      online: true,
      isPremium: true,
      lastActive: "Agora",
    },
    messages: [
      {
        id: 1,
        sender: "them",
        text: "Oi! Vi que temos interesses em comum. Você gosta de música afro-brasileira?",
        time: "10:30",
        status: "read",
      },
      {
        id: 2,
        sender: "me",
        text: "Olá Ana! Sim, adoro! Especialmente MPB com influências africanas. Você conhece Luedji Luna?",
        time: "10:32",
        status: "read",
      },
      {
        id: 3,
        sender: "them",
        text: "Claro! Ela é incrível! Já foi em algum show dela?",
        time: "10:35",
        status: "read",
      },
      {
        id: 4,
        sender: "me",
        text: "Ainda não tive a oportunidade. Mas está na minha lista! Quais outros artistas você curte?",
        time: "10:38",
        status: "read",
      },
      {
        id: 5,
        sender: "them",
        text: "Adoro Elza Soares, Liniker, Xênia França... E você?",
        time: "10:40",
        status: "delivered",
      },
    ],
    unread: 1,
  },
  {
    id: 2,
    user: {
      id: 3,
      name: "Juliana",
      photo: "/images/female-profile-1.png",
      online: false,
      isPremium: true,
      lastActive: "Há 30 min",
    },
    messages: [
      {
        id: 1,
        sender: "them",
        text: "Oi! Tudo bem? Vi que você também se interessa por fotografia!",
        time: "Ontem",
        status: "read",
      },
      {
        id: 2,
        sender: "me",
        text: "Oi Juliana! Sim, adoro fotografia. Tenho explorado bastante a fotografia documental de comunidades tradicionais.",
        time: "Ontem",
        status: "read",
      },
      {
        id: 3,
        sender: "them",
        text: "Que incrível! Eu tenho trabalhado com retratos que exploram a identidade e ancestralidade. Poderíamos trocar experiências!",
        time: "Ontem",
        status: "read",
      },
    ],
    unread: 0,
  },
  {
    id: 3,
    user: {
      id: 5,
      name: "Mariana",
      photo: "/images/female-profile.png",
      online: true,
      isPremium: false,
      lastActive: "Agora",
    },
    messages: [
      {
        id: 1,
        sender: "them",
        text: "Oi! Você já participou de algum festival de cultura afro?",
        time: "12:15",
        status: "read",
      },
      {
        id: 2,
        sender: "me",
        text: "Olá Mariana! Sim, fui ao Afropunk ano passado e foi uma experiência incrível!",
        time: "12:20",
        status: "read",
      },
      {
        id: 3,
        sender: "them",
        text: "Que legal! Eu nunca fui, mas está na minha lista. Como foi?",
        time: "12:22",
        status: "read",
      },
    ],
    unread: 0,
  },
  {
    id: 4,
    user: {
      id: 2,
      name: "Carlos",
      photo: "/images/male-profile-1.png",
      online: false,
      isPremium: false,
      lastActive: "Há 2h",
    },
    messages: [
      {
        id: 1,
        sender: "them",
        text: "E aí, curtiu aquele documentário sobre a história do samba que te recomendei?",
        time: "Ontem",
        status: "read",
      },
    ],
    unread: 0,
  },
]

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
  const [activeConversation, setActiveConversation] = useState<number | null>(1) // Iniciar com a primeira conversa
  const [newMessage, setNewMessage] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState("recent")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Encontrar a conversa ativa
  const currentConversation = conversations.find((conv) => conv.id === activeConversation)

  // Rolar para o final das mensagens quando a conversa muda ou uma nova mensagem é enviada
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [activeConversation, conversations])

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    // Em um app real, enviaríamos a mensagem para o backend
    // Aqui apenas simulamos o envio

    setNewMessage("")
    // Fechar o seletor de emojis se estiver aberto
    setShowEmojiPicker(false)
  }

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji)
  }

  const handleBackToMatches = () => {
    router.push("/matches")
  }

  const handleOpenConversation = (conversationId: number) => {
    setActiveConversation(conversationId)
  }

  const handleUpgrade = () => {
    router.push("/subscription")
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" className="text-oraculo-muted" onClick={handleBackToMatches}>
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <Logo size="sm" />

          <Button
            variant="outline"
            size="sm"
            className="text-oraculo-purple border-oraculo-purple/30 hover:bg-oraculo-purple/10"
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
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                  activeConversation === conversation.id ? "bg-oraculo-purple/5 border-l-4 border-oraculo-purple" : ""
                }`}
                onClick={() => handleOpenConversation(conversation.id)}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 border border-gray-200">
                    <AvatarImage src={conversation.user.photo} alt={conversation.user.name} />
                    <AvatarFallback>{conversation.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>

                  {conversation.user.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                  )}
                </div>

                <div className="ml-3 flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-oraculo-dark flex items-center">
                      {conversation.user.name}
                      {conversation.user.isPremium && <PremiumBadge size="sm" className="ml-1" />}
                    </h3>
                    <span className="text-xs text-oraculo-muted">
                      {conversation.messages[conversation.messages.length - 1].time}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-oraculo-muted truncate">
                      {conversation.messages[conversation.messages.length - 1].sender === "me" ? "Você: " : ""}
                      {conversation.messages[conversation.messages.length - 1].text}
                    </p>

                    {conversation.unread > 0 && (
                      <Badge className="bg-oraculo-purple text-white ml-2">{conversation.unread}</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Área de conversa */}
        <div className={`flex-1 flex flex-col ${activeConversation ? "block" : "hidden md:block"}`}>
          {currentConversation ? (
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
                    <AvatarImage src={currentConversation.user.photo} alt={currentConversation.user.name} />
                    <AvatarFallback>{currentConversation.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>

                  <div className="ml-3">
                    <div className="flex items-center">
                      <h3 className="font-medium text-oraculo-dark">{currentConversation.user.name}</h3>
                      {currentConversation.user.isPremium && <PremiumBadge size="sm" className="ml-1" />}
                    </div>
                    <p className="text-xs text-oraculo-muted">
                      {currentConversation.user.online ? "Online" : currentConversation.user.lastActive}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
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

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-oraculo-muted">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-0">
                      <div className="py-1">
                        <button className="w-full text-left px-4 py-2 text-sm text-oraculo-dark hover:bg-oraculo-purple/10">
                          Ver perfil
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-oraculo-dark hover:bg-oraculo-purple/10">
                          Silenciar notificações
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                          Bloquear
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Mensagens */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {currentConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
                    >
                      {message.sender === "them" && (
                        <Avatar className="h-8 w-8 mr-2 mt-1">
                          <AvatarImage src={currentConversation.user.photo} alt={currentConversation.user.name} />
                          <AvatarFallback>{currentConversation.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}

                      <div
                        className={`max-w-[70%] p-3 rounded-2xl ${
                          message.sender === "me"
                            ? "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white"
                            : "bg-gray-100 text-oraculo-dark"
                        }`}
                      >
                        <p>{message.text}</p>
                        <div
                          className={`text-xs mt-1 flex items-center ${
                            message.sender === "me" ? "text-white/70 justify-end" : "text-oraculo-muted"
                          }`}
                        >
                          {message.time}
                          {message.sender === "me" && (
                            <span className="ml-1">{message.status === "read" ? "✓✓" : "✓"}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input de mensagem */}
              <div className="p-3 border-t border-gray-200">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-oraculo-muted"
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>

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
                            <TabsTrigger value="recent" className="px-2">
                              🕒
                            </TabsTrigger>
                            <TabsTrigger value="culture" className="px-2">
                              🎭
                            </TabsTrigger>
                            <TabsTrigger value="people" className="px-2">
                              👋🏾
                            </TabsTrigger>
                            <TabsTrigger value="nature" className="px-2">
                              🌍
                            </TabsTrigger>
                            <TabsTrigger value="symbols" className="px-2">
                              ♥️
                            </TabsTrigger>
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

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-oraculo-muted"
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    <ImageIcon className="h-5 w-5" />
                  </Button>

                  <Input
                    type="text"
                    placeholder="Digite uma mensagem..."
                    className="flex-1 mx-2 bg-gray-100 border-0"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSendMessage()
                      }
                    }}
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-oraculo-purple"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div>
                <Heart className="h-16 w-16 text-oraculo-purple/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold gradient-text mb-2">Suas Mensagens</h3>
                <p className="text-oraculo-muted">
                  Selecione uma conversa para começar a trocar mensagens com seus matches.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para upgrade */}
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

