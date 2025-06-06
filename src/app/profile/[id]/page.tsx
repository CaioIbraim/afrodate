"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Swal from "sweetalert2"
import withReactContent from "sweetalert2-react-content"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/hooks/use-user"
import { Loader2, Heart, MessageSquare } from "lucide-react"
import { motion } from "framer-motion"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ProfileHeader } from "@/components/profile-header"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"

const MySwal = withReactContent(Swal)

// Types
type Gender = "HOMEM" | "MULHER" | "NAO_BINARIO" | "OUTRO"
type Photo = {
  name: string
  storage_path: string
  publicUrl: string
  isPrimary: boolean
}
type ProfileData = {
  id: string
  name: string
  birth_date: string
  gender: Gender
  bio: string
  city: string
  profession: string
  interests: string[]
  avatar_url: string | null
  user_id: string
}

// Componente para exibir informações do perfil
const ProfileInfo = ({
  profileData,
  calculateAge,
}: {
  profileData: ProfileData | null
  calculateAge: (birthDate: string) => number | null
}) => (
  <Card className="mb-6 border-none shadow-sm">
    <CardHeader>
      <CardTitle>Informações do Perfil</CardTitle>
      <CardDescription>Detalhes sobre {profileData?.name || "o usuário"}</CardDescription>
    </CardHeader>
    <CardContent>
      {profileData ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar className="w-24 h-24">
              <AvatarImage
                src={profileData.avatar_url || "/placeholder-image.png"}
                alt={profileData.name}
                className="object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder-image.png"
                }}
              />
              <AvatarFallback className="text-2xl">
                {profileData.name.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold text-oraculo-dark">{profileData.name}</h3>
              {calculateAge(profileData.birth_date) && (
                <p className="text-sm text-oraculo-muted">{calculateAge(profileData.birth_date)} anos</p>
              )}
              <p className="text-sm text-oraculo-muted">{profileData.city}</p>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700">Profissão</h4>
            <p className="text-oraculo-muted">{profileData.profession || "Não informado"}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700">Sobre</h4>
            <p className="text-oraculo-muted">{profileData.bio || "Sem biografia"}</p>
          </div>
          {profileData.interests.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700">Interesses</h4>
              <div className="flex flex-wrap gap-2">
                {profileData.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="bg-oraculo-purple/10 text-oraculo-purple text-xs px-2 py-1 rounded"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-oraculo-muted">Nenhuma informação disponível.</p>
      )}
    </CardContent>
  </Card>
)

// Componente para exibir fotos do perfil
const ProfilePhotos = ({ photos }: { photos: Photo[] }) => (
  <Card className="mb-6 border-none shadow-sm">
    <CardHeader>
      <CardTitle>Fotos</CardTitle>
      <CardDescription>Fotos do perfil do usuário</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.length === 0 ? (
          <div className="col-span-3 text-center py-12 border border-dashed rounded-md">
            <p className="text-oraculo-muted">Sem fotos disponíveis.</p>
          </div>
        ) : (
          photos.map((photo, index) => (
            <div key={photo.storage_path} className="relative">
              <img
                src={photo.publicUrl}
                alt={`Foto ${index + 1}`}
                className={`w-full h-48 object-cover rounded-md ${
                  photo.isPrimary ? "ring-2 ring-oraculo-purple" : ""
                }`}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder-image.png"
                }}
              />
              {photo.isPrimary && (
                <div className="absolute top-2 left-2 bg-oraculo-purple text-white text-xs px-2 py-1 rounded">
                  Principal
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </CardContent>
  </Card>
)

export default function ProfileView() {
  const router = useRouter()
  const { user, isLoading: userLoading, profile } = useUser()
  const params = useParams()
  const profileId = params.id as string

  // State
  const [activeTab, setActiveTab] = useState<"informacoes" | "fotos">("informacoes")
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasLiked, setHasLiked] = useState(false)
  const [hasMatch, setHasMatch] = useState(false)
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [matchAlertShown, setMatchAlertShown] = useState(false)

  // Check subscription level
  const hasPremiumSubscription = profile?.subscription === 3

  // Calculate user age
  const calculateAge = useCallback((birthDate: string): number | null => {
    if (!birthDate) return null
    const birth = new Date(birthDate)
    const today = new Date()
    if (isNaN(birth.getTime()) || birth > today) return null
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age >= 18 ? age : null
  }, [])

  // Show SweetAlert2 for match
  const showMatchAlert = useCallback(() => {
    if (matchAlertShown) return
    MySwal.fire({
      icon: "success",
      title: "É um Match!",
      html: `
        <p class="text-lg text-gray-700">
          Vocês são uma conexão cósmica, ${profileData?.name}! O universo alinhou seus caminhos para criar algo especial. 
          ${hasPremiumSubscription ? "Que tal começar essa jornada com uma mensagem incrível?" : "Faça um upgrade para Premium para enviar mensagens!"}
        </p>
      `,
      customClass: {
        popup: "border-2 border-transparent bg-white rounded-xl",
        title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
        confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
      },
      confirmButtonText: hasPremiumSubscription ? "Enviar Mensagem" : "Fazer Upgrade",
      willOpen: (popup) => {
        popup.setAttribute("aria-live", "assertive")
      },
    }).then((result) => {
      if (result.isConfirmed && hasPremiumSubscription) {
        setActiveTab("informacoes") // Focus on message input
      } else if (result.isConfirmed && !hasPremiumSubscription) {
        router.push("/subscription")
      }
    })
    setMatchAlertShown(true)
  }, [profileData?.name, matchAlertShown, hasPremiumSubscription, router])

  // Fetch profile data, photos, likes, and match status
  const loadProfile = useCallback(async () => {
    if (!user) {
      MySwal.fire({
        icon: "error",
        title: "Acesso Negado",
        html: '<p class="text-lg text-gray-700">Você precisa estar logado para visualizar este perfil.</p>',
        customClass: {
          popup: "border-2 border-transparent bg-white rounded-xl",
          title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
          confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
        },
        confirmButtonText: "Ir para Login",
      }).then((result) => {
        if (result.isConfirmed) {
          router.push("/login")
        }
      })
      return
    }

    if (!profileId) {
      MySwal.fire({
        icon: "error",
        title: "Erro",
        html: '<p class="text-lg text-gray-700">ID do perfil não fornecido.</p>',
        customClass: {
          popup: "border-2 border-transparent bg-white rounded-xl",
          title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
          confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
        },
        confirmButtonText: "Voltar",
      }).then((result) => {
        if (result.isConfirmed) {
          router.push("/discover")
        }
      })
      return
    }

    if (!profile) {
      MySwal.fire({
        icon: "error",
        title: "Erro",
        html: '<p class="text-lg text-gray-700">Seu perfil não está carregado. Tente novamente.</p>',
        customClass: {
          popup: "border-2 border-transparent bg-white rounded-xl",
          title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
          confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
        },
        confirmButtonText: "Tentar Novamente",
      }).then((result) => {
        if (result.isConfirmed) {
          router.push("/profile")
        }
      })
      return
    }

    setIsLoading(true)
    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, birth_date, gender, bio, city, profession, interests, avatar_url, user_id")
        .eq("id", profileId)
        .single()
      if (profileError) throw profileError
      setProfileData(profileData)

      // Fetch photos
      const { data: photosData, error: photosError } = await supabase
        .from("profile_photos")
        .select("storage_path, is_primary")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: true })
      if (photosError) throw photosError

      const photoUrls = await Promise.all(
        photosData.map(async (photo) => {
          const { data: publicUrlData } = supabase.storage.from("imagens").getPublicUrl(photo.storage_path)
          let url = publicUrlData.publicUrl
          try {
            const response = await fetch(url, { method: "HEAD" })
            if (!response.ok) throw new Error("Public URL inaccessible")
          } catch {
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from("imagens")
              . createSignedUrl(photo.storage_path, 3600)
            if (signedUrlError) throw signedUrlError
            url = signedUrlData.signedUrl
          }
          return {
            name: photo.storage_path.split("/").pop()!,
            storage_path: photo.storage_path,
            publicUrl: url,
            isPrimary: photo.is_primary,
          }
        })
      )
      setPhotos(photoUrls)

      // Check like status
      const { data: likeData, error: likeError } = await supabase
        .from("likes")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("liked_profile_id", profileId)
        .single()
      if (likeError && likeError.code !== "PGRST116") throw likeError
      setHasLiked(!!likeData)

      // Check match status
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("id")
        .or(`profile1_id.eq.${profile.id},profile2_id.eq.${profile.id}`)
        .or(`profile1_id.eq.${profileId},profile2_id.eq.${profileId}`)
        .single()
      if (matchError && matchError.code !== "PGRST116") throw matchError
      setHasMatch(!!matchData)
      if (matchData && !matchAlertShown) {
        showMatchAlert()
      }
    } catch (error: any) {
      MySwal.fire({
        icon: "error",
        title: "Erro ao Carregar Perfil",
        html: `<p class="text-lg text-gray-700">Não foi possível carregar o perfil. ${error.message}</p>`,
        customClass: {
          popup: "border-2 border-transparent bg-white rounded-xl",
          title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
          confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
        },
        confirmButtonText: "Voltar",
      }).then((result) => {
        if (result.isConfirmed) {
          router.push("/discover")
        }
      })
    } finally {
      setIsLoading(false)
    }
  }, [profileId, user, profile, router, matchAlertShown, showMatchAlert])

  // Handle like action
  const handleLike = async () => {
    if (!user || !profile || !profileId) {
      MySwal.fire({
        icon: "error",
        title: "Erro",
        html: '<p class="text-lg text-gray-700">Usuário não autenticado ou perfil inválido.</p>',
        customClass: {
          popup: "border-2 border-transparent bg-white rounded-xl",
          title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
          confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
        },
        confirmButtonText: "OK",
      })
      return
    }
    try {
      const { error } = await supabase.from("likes").insert({
        profile_id: profile.id,
        liked_profile_id: profileId,
        created_at: new Date().toISOString(),
      })
      if (error) throw error
      setHasLiked(true)
      MySwal.fire({
        icon: "success",
        title: "Perfil Curtido!",
        html: '<p class="text-lg text-gray-700">Você curtiu este perfil! Aguardando um match...</p>',
        customClass: {
          popup: "border-2 border-transparent bg-white rounded-xl",
          title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
          confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
        },
        confirmButtonText: "OK",
      })

      // Check for match
      const { data: mutualLikeData, error: mutualLikeError } = await supabase
        .from("likes")
        .select("id")
        .eq("profile_id", profileId)
        .eq("liked_profile_id", profile.id)
        .single()
      if (mutualLikeError && mutualLikeError.code !== "PGRST116") throw mutualLikeError
      if (mutualLikeData) {
        setHasMatch(true)
        showMatchAlert()
      }
    } catch (error: any) {
      MySwal.fire({
        icon: "error",
        title: "Erro ao Curtir",
        html: `<p class="text-lg text-gray-700">${
          error.message === "too_many_requests"
            ? "Muitas tentativas. Tente novamente em alguns minutos."
            : "Não foi possível curtir o perfil."
        }</p>`,
        customClass: {
          popup: "border-2 border-transparent bg-white rounded-xl",
          title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
          confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
        },
        confirmButtonText: "OK",
      })
    }
  }

  // Handle send message
  const handleSendMessage = async () => {
    if (!user || !profileId || !message.trim() || !hasPremiumSubscription) {
      MySwal.fire({
        icon: "error",
        title: "Erro",
        html: `<p class="text-lg text-gray-700">${
          !user
            ? "Usuário não autenticado."
            : !profileId
            ? "Perfil inválido."
            : !message.trim()
            ? "Digite uma mensagem antes de enviar."
            : "Você precisa de uma assinatura Premium para enviar mensagens."
        }</p>`,
        customClass: {
          popup: "border-2 border-transparent bg-white rounded-xl",
          title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
          confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
        },
        confirmButtonText: !hasPremiumSubscription ? "Fazer Upgrade" : "OK",
      }).then((result) => {
        if (result.isConfirmed && !hasPremiumSubscription) {
          router.push("/subscription")
        }
      })
      return
    }
    setIsSending(true)
    try {
      const { data: receiverProfile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", profileId)
        .single()
      if (profileError) throw profileError

      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: receiverProfile.user_id,
        content: message.trim(),
        created_at: new Date().toISOString(),
      })
      if (error) throw error
      setMessage("")
      MySwal.fire({
        icon: "success",
        title: "Mensagem Enviada!",
        html: '<p class="text-lg text-gray-700">Sua mensagem foi enviada com sucesso!</p>',
        customClass: {
          popup: "border-2 border-transparent bg-white rounded-xl",
          title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
          confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
        },
        confirmButtonText: "Ir para Mensagens",
      }).then((result) => {
        if (result.isConfirmed) {
          router.push(`/messages/${profileId}`)
        }
      })
    } catch (error: any) {
      MySwal.fire({
        icon: "error",
        title: "Erro ao Enviar",
        html: `<p class="text-lg text-gray-700">${
          error.message === "too_many_requests"
            ? "Muitas tentativas. Tente novamente em alguns minutos."
            : "Não foi possível enviar a mensagem."
        }</p>`,
        customClass: {
          popup: "border-2 border-transparent bg-white rounded-xl",
          title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
          confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
        },
        confirmButtonText: "OK",
      })
    } finally {
      setIsSending(false)
    }
  }

  // Load profile on mount
  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // Loading state
  if (isLoading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" aria-label="Carregando">
        <Loader2 className="h-8 w-8 animate-spin text-oraculo-purple" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="app-container flex flex-col min-h-screen bg-gray-50 px-4 py-6">
      <ProfileHeader name={profile!.name} avatarUrl={profile!.avatar_url} />

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-md mx-auto w-full"
      >
        <h2 className="text-2xl font-bold gradient-text text-center mb-6">
          Perfil de {profileData?.name || "Usuário"}
        </h2>

        {hasMatch && (
          <Badge className="bg-oraculo-purple/10 text-oraculo-purple text-xs flex items-center justify-center mb-6">
            <Sparkles className="h-3 w-3 mr-1" />
            Match!
          </Badge>
        )}

        <div className="flex justify-between mb-6">
          {!hasLiked && !hasMatch && (
            <Button
              onClick={handleLike}
              className="flex-1 mr-2 gradient-button"
              aria-label="Curtir perfil"
            >
              <Heart className="h-4 w-4 mr-2 fill-current" aria-hidden="true" />
              Curtir
            </Button>
          )}
          {hasMatch && hasPremiumSubscription && (
            <Button
              onClick={() => setActiveTab("informacoes")}
              className="flex-1 gradient-button"
              aria-label="Enviar mensagem"
            >
              <MessageSquare className="h-4 w-4 mr-2" aria-hidden="true" />
              Mensagem
            </Button>
          )}
        </div>

        {hasMatch && hasPremiumSubscription && (
          <Card className="mb-6 border-none shadow-sm">
            <CardHeader>
              <CardTitle>Enviar Mensagem</CardTitle>
              <CardDescription>Escreva uma mensagem para {profileData?.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  disabled={isSending}
                  aria-label="Mensagem"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || !message.trim()}
                  className="w-full gradient-button"
                  aria-label="Enviar mensagem"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!hasMatch && !hasPremiumSubscription && (
          <Card className="mb-6 border-none shadow-sm">
            <CardContent className="text-center py-4">
              <p className="text-oraculo-muted">
                Faça um upgrade para Premium para enviar mensagens após um match!
              </p>
              <Button
                onClick={() => router.push("/subscription")}
                className="mt-4 gradient-button"
              >
                Fazer Upgrade
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        >
          <TabsList className="grid grid-cols-2 w-full rounded-xl bg-white shadow-sm border border-gray-200">
            <TabsTrigger
              value="informacoes"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Informações
            </TabsTrigger>
            <TabsTrigger
              value="fotos"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Fotos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="informacoes">
            <ProfileInfo profileData={profileData} calculateAge={calculateAge} />
          </TabsContent>

          <TabsContent value="fotos">
            <ProfilePhotos photos={photos} />
          </TabsContent>
        </Tabs>
      </motion.main>
    </div>
  )
}