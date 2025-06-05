"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
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
import { Loader2, ChevronLeft, Heart, MessageSquare } from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { motion } from "framer-motion"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

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
}

// Componente para exibir informações do perfil
const ProfileInfo = ({
  profileData,
  calculateAge,
}: {
  profileData: ProfileData | null
  calculateAge: (birthDate: string) => number | null
}) => (
  <Card className="mb-6">
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
              <h3 className="text-xl font-semibold">{profileData.name}</h3>
              {calculateAge(profileData.birth_date) && (
                <p className="text-sm text-gray-500">{calculateAge(profileData.birth_date)} anos</p>
              )}
              <p className="text-sm text-gray-500">{profileData.city}</p>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700">Profissão</h4>
            <p className="text-gray-600">{profileData.profession || "Não informado"}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700">Sobre</h4>
            <p className="text-gray-600">{profileData.bio || "Sem biografia"}</p>
          </div>
          {profileData.interests.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700">Interesses</h4>
              <div className="flex flex-wrap gap-2">
                {profileData.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-gray-500">Nenhuma informação disponível.</p>
      )}
    </CardContent>
  </Card>
)

// Componente para exibir fotos do perfil
const ProfilePhotos = ({ photos }: { photos: Photo[] }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>Fotos</CardTitle>
      <CardDescription>Fotos do perfil do usuário</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.length === 0 ? (
          <div className="col-span-3 text-center py-12 border border-dashed rounded-md">
            <p>Sem fotos disponíveis.</p>
          </div>
        ) : (
          photos.map((photo, index) => (
            <div key={photo.storage_path} className="relative">
              <img
                src={photo.publicUrl}
                alt={`Foto ${index + 1}`}
                className={`w-full h-48 object-cover rounded-md ${
                  photo.isPrimary ? "ring-2 ring-purple-500" : ""
                }`}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder-image.png"
                }}
              />
              {photo.isPrimary && (
                <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded">
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
  const { toast } = useToast()
  const { user, isLoading: userLoading } = useUser()
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
          Que tal começar essa jornada com uma mensagem incrível?
        </p>
      `,
      customClass: {
        popup: "border-2 border-transparent bg-white rounded-xl",
        title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
        confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
      },
      confirmButtonText: "Enviar Mensagem",
      willOpen: (popup) => {
        popup.setAttribute("aria-live", "assertive")
      },
    }).then((result) => {
      if (result.isConfirmed) {
        setActiveTab("informacoes") // Focus on message input
      }
    })
    setMatchAlertShown(true)
  }, [profileData?.name, matchAlertShown])

  // Fetch profile data, photos, likes, and match status
  const loadProfile = useCallback(async () => {
    if (!profileId) {
      toast({
        title: "Erro",
        description: "ID do perfil não fornecido.",
        variant: "destructive",
      })
      router.push("/profile")
      return
    }
    setIsLoading(true)
    try {
      console.log("[loadProfile] Fetching profile for profile_id:", profileId)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, birth_date, gender, bio, city, profession, interests, avatar_url, user_id")
        .eq("id", profileId)
        .single()
      if (profileError) {
        console.log("[loadProfile] Profile error:", profileError.message)
        throw profileError
      }
      setProfileData(profile)

      console.log("[loadProfile] Fetching photos for profile_id:", profileId)
      const { data: photosData, error: photosError } = await supabase
        .from("profile_photos")
        .select("storage_path, is_primary")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: true })
      if (photosError) {
        console.log("[loadProfile] Photos error:", photosError.message)
        throw photosError
      }

      const photoUrls = await Promise.all(
        photosData.map(async (photo) => {
          const { data: publicUrlData } = supabase.storage.from("imagens").getPublicUrl(photo.storage_path)
          let url = publicUrlData.publicUrl
          try {
            const response = await fetch(url, { method: "HEAD" })
            if (!response.ok) throw new Error("Public URL inaccessible")
            console.log("[loadProfile] Public URL accessible:", url)
          } catch {
            console.log("[loadProfile] Public URL failed, trying signed URL for:", photo.storage_path)
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from("imagens")
              .createSignedUrl(photo.storage_path, 3600)
            if (signedUrlError) throw signedUrlError
            url = signedUrlData.signedUrl
            console.log("[loadProfile] Signed URL:", url)
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

      // Check like and match status
      if (user && profile?.user_id) {
        // Check if user has liked this profile
        const { data: likeData, error: likeError } = await supabase
          .from("likes")
          .select("id")
          .eq("profile_id", profile.id)
          .eq("liked_profile_id", profileId)
          .single()
        if (likeError && likeError.code !== "PGRST116") {
          console.log("[loadProfile] Like check error:", likeError.message)
        }
        setHasLiked(!!likeData)

        // Check if there's a match (mutual like)
        if (likeData) {
          const { data: mutualLikeData, error: mutualLikeError } = await supabase
            .from("likes")
            .select("id")
            .eq("profile_id", profile.id)
            .eq("liked_profile_id", profileId)
            .single()
          if (mutualLikeError && mutualLikeError.code !== "PGRST116") {
            console.log("[loadProfile] Mutual like check error:", mutualLikeError.message)
          }
          setHasMatch(!!mutualLikeData)
          if (mutualLikeData && !matchAlertShown) {
            showMatchAlert()
          }
        }
      }
    } catch (error: any) {
      console.log("[loadProfile] Error:", error.message)
      toast({
        title: "Erro",
        description: "Não foi possível carregar o perfil.",
        variant: "destructive",
      })
      router.push("/profile")
    } finally {
      setIsLoading(false)
    }
  }, [profileId, user, toast, router, matchAlertShown, showMatchAlert])

  // Handle like action
  const handleLike = async () => {
    if (!user || !profileId) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado ou perfil inválido.",
        variant: "destructive",
      })
      return
    }
    if (hasLiked) {
      toast({
        title: "Aviso",
        description: "Você já curtiu este perfil!",
      })
      return
    }
    try {
      console.log("[handleLike] Liking profile_id:", profileId)
      const { error } = await supabase.from("likes").insert({
        liker_id: user.id,
        liked_profile_id: profileId,
        created_at: new Date().toISOString(),
      })
      if (error) {
        console.log("[handleLike] Error:", error.message)
        throw error
      }
      setHasLiked(true)
      // Check for match after liking
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", profileId)
        .single()
      if (profileError) {
        console.log("[handleLike] Profile fetch error:", profileError.message)
        throw profileError
      }
      const { data: mutualLikeData, error: mutualLikeError } = await supabase
        .from("likes")
        .select("id")
        .eq("liker_id", profile.user_id)
        .eq("liked_profile_id", user.id)
        .single()
      if (mutualLikeError && mutualLikeError.code !== "PGRST116") {
        console.log("[handleLike] Mutual like check error:", mutualLikeError.message)
      }
      if (mutualLikeData) {
        setHasMatch(true)
        showMatchAlert()
      } else {
        toast({
          title: "Sucesso",
          description: "Você curtiu este perfil! Aguardando um match...",
        })
      }
    } catch (error: any) {
      console.log("[handleLike] Error:", error.message)
      toast({
        title: "Erro",
        description: error.message === "too_many_requests"
          ? "Muitas tentativas. Tente novamente em alguns minutos."
          : "Não foi possível curtir o perfil.",
        variant: "destructive",
      })
    }
  }

  // Handle send message
  const handleSendMessage = async () => {
    if (!user || !profileId || !message.trim()) {
      toast({
        title: "Erro",
        description: !user
          ? "Usuário não autenticado."
          : !profileId
          ? "Perfil inválido."
          : "Digite uma mensagem antes de enviar.",
        variant: "destructive",
      })
      return
    }
    setIsSending(true)
    try {
      console.log("[handleSendMessage] Sending message to profile_id:", profileId)
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: profileId,
        content: message.trim(),
        created_at: new Date().toISOString(),
      })
      if (error) {
        console.log("[handleSendMessage] Error:", error.message)
        throw error
      }
      setMessage("")
      toast({
        title: "Sucesso",
        description: "Mensagem enviada com sucesso!",
      })
      router.push(`/messages/${profileId}`)
    } catch (error: any) {
      console.log("[handleSendMessage] Error:", error.message)
      toast({
        title: "Erro",
        description: error.message === "too_many_requests"
          ? "Muitas tentativas. Tente novamente em alguns minutos."
          : "Não foi possível enviar a mensagem.",
        variant: "destructive",
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
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 px-4 py-6">
      <header className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label="Voltar"
        >
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </Button>
        <Logo size="sm" />
        <div className="w-10" />
      </header>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md mx-auto w-full"
      >
        <h2 className="text-2xl font-bold gradient-text text-center mb-6">
          Perfil de {profileData?.name || "Usuário"}
        </h2>

        <div className="flex justify-between mb-6">
          {!hasMatch && (
            <Button
              onClick={handleLike}
              disabled={hasLiked || !user}
              className={`flex-1 mr-2 ${hasLiked ? "bg-gray-300" : "gradient-button"}`}
              aria-label={hasLiked ? "Perfil já curtido" : "Curtir perfil"}
            >
              <Heart className={`h-4 w-4 mr-2 ${hasLiked ? "" : "fill-current"}`} aria-hidden="true" />
              {hasLiked ? "Curtido" : "Curtir"}
            </Button>
          )}
          <Button
            onClick={() => setActiveTab("informacoes")}
            className={`flex-1 ${hasMatch ? "w-full" : "ml-2"} gradient-button`}
            aria-label="Enviar mensagem"
          >
            <MessageSquare className="h-4 w-4 mr-2" aria-hidden="true" />
            Mensagem
          </Button>
        </div>

        {user && (
          <Card className="mb-6">
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