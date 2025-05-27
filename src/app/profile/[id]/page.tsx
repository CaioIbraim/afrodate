"use client"

import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ChevronLeft, Heart } from "lucide-react"
import { motion } from "framer-motion"
import { Logo } from "@/components/ui/logo"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/hooks/use-user"
import { toast } from "@/components/ui/use-toast"
import { ProfileHeader } from "@/components/profile-header"

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [isFavorited, setIsFavorited] = useState(false)
  const [matchFound, setMatchFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const { user, profile: currentUser } = useUser()
  const currentUserId = currentUser?.id || null

  // Carrega o perfil público
  useEffect(() => {
    const loadPublicProfile = async () => {
      if (!resolvedParams.id || !currentUserId) return
      if (resolvedParams.id === currentUserId) {
        router.push("/profile")
        return
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(`
            *,
            profile_photos(storage_path, is_primary)
          `)
          .eq("id", resolvedParams.id)
          .single()

        if (error) throw error
        if (!data) {
          router.push("/matches")
          return
        }

        setProfile(data)

        // Carregar fotos
        const photoUrls = data.profile_photos.map((photo) => {
          const { publicUrl } = supabase.storage
            .from("imagens")
            .getPublicUrl(photo.storage_path)

          return {
            ...photo,
            publicUrl: publicUrl,
            isPrimary: photo.is_primary,
          }
        })

        setPhotos(photoUrls)

        // Verificar se já curtiu
        const { count } = await supabase
          .from("likes")
          .select("*", { count: "exact" })
          .eq("profile_id", currentUserId)
          .eq("liked_profile_id", resolvedParams.id)

        setIsFavorited(count > 0)

        // Verificar match inverso
        const { count: matchCount } = await supabase
          .from("likes")
          .select("*", { count: "exact" })
          .eq("profile_id", resolvedParams.id)
          .eq("liked_profile_id", currentUserId)

        setMatchFound(matchCount > 0)

        setLoading(false)
      } catch (err: any) {
        console.error("Erro ao carregar perfil:", err.message)
        router.push("/matches")
      }
    }

    loadPublicProfile()
  }, [resolvedParams.id, currentUserId])

  // Dar like ou remover like
  const handleLike = async () => {
    if (!currentUserId || !profile) return

    try {
      if (isFavorited) {
        // Remover like
        await supabase
          .from("likes")
          .delete()
          .eq("profile_id", currentUserId)
          .eq("liked_profile_id", profile.id)

        setIsFavorited(false)
        setMatchFound(false)
        toast({ title: "Descurtido", description: "Você removeu o like." })
      } else {
        // Adicionar like
        const { error } = await supabase
          .from("likes")
          .insert({
            profile_id: currentUserId,
            liked_profile_id: profile.id,
          })

        if (error) throw error

        setIsFavorited(true)
        toast({ title: "Curtido!", description: "Você curtiu esse perfil." })

        // Verifica match automático
        const { count } = await supabase
          .from("likes")
          .select("*", { count: "exact" })
          .eq("profile_id", profile.id)
          .eq("liked_profile_id", currentUserId)

        if (count > 0) {
          setMatchFound(true)
          toast({ title: "Match Encontrado!", description: "Vocês se curtiram mutuamente!" })
        }
      }
    } catch (err: any) {
      console.error("Erro ao curtir:", err.message)
      toast({
        title: "Erro",
        description: "Não foi possível curtir este perfil.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-white rounded-full"></div>
          <p className="mt-4 text-gray-500">Carregando perfil...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Perfil não encontrado.</p>
      </div>
    )
  }

  const bioText = profile.bio || ""
  const displayedBio = bioText.length > 150 ? `${bioText.slice(0, 150)}...` : bioText

  return (
    <div className="app-container">
      {/* Header */}

      <ProfileHeader
          name={profile.name}
          avatarUrl={profile.avatar_url}
          isPremium={profile.is_premium}
          online={profile.online}
          lastActive={profile.last_active}
          onBack={() => router.back()}
          onOpenProfile={() => router.push(`/profile/${profile.id}`)}
        />


      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </Button>
        <Logo size="sm" />
        <div className="w-10"></div>
      </div>

      {/* Foto Principal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex justify-center mb-6"
      >
        <Avatar className="w-32 h-32 ring-2 ring-purple-500">
          <AvatarImage src={profile.avatar_url} alt={profile.name} />
          <AvatarFallback>{profile.name.charAt(0)}</AvatarFallback>
        </Avatar>
      </motion.div>

      {/* Nome e localização */}
      <h3 className="text-2xl font-bold gradient-text text-center mb-2">{profile.name}</h3>
      <div className="flex items-center justify-center gap-1 text-gray-600 mb-6">
        <span>{profile.city || "Localização não informada"}</span>
      </div>

      {/* Abas */}
      <Tabs defaultValue="about" className="w-full">
        <TabsList className="grid grid-cols-3 w-full bg-white p-1 shadow-sm rounded-xl">
          <TabsTrigger value="about">Sobre</TabsTrigger>
          <TabsTrigger value="fotos">Fotos</TabsTrigger>
          <TabsTrigger value="info">Mais Info</TabsTrigger>
        </TabsList>

        {/* Aba: Sobre */}
        <TabsContent value="about">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Sobre {profile.name}</CardTitle>
              <CardDescription>Biografia e informações pessoais</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{displayedBio}</p>
              {bioText.length > 150 && (
                <Button variant="link" onClick={() => router.push(`/profile/${profile.id}`)}>
                  Ler mais
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Fotos */}
        <TabsContent value="fotos">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Fotos</CardTitle>
              <CardDescription>Galeria de fotos de {profile.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo.storage_path}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-48 object-cover rounded-md"
                    />
                  </div>
                ))}
                {photos.length === 0 && (
                  <div className="col-span-3 text-center py-12 border border-dashed rounded-md">
                    <p className="text-gray-500">Nenhuma foto disponível.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Mais Info */}
        <TabsContent value="info">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Preferências</CardTitle>
              <CardDescription>O que {profile.name} procura</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700">Gênero de Interesse</h4>
                  <p className="text-gray-600 capitalize">
                    {profile.gender_preference || "TODOS"}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">Faixa Etária</h4>
                  <p className="text-gray-600">
                    {profile.min_age || 18} - {profile.max_age || 50} anos
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">Profissão</h4>
                  <p className="text-gray-600">{profile.profession || "Não informado"}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">Interesses</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.interests?.length > 0 ? (
                      profile.interests.map((interest: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                          {interest}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">Nenhum interesse cadastrado</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ações */}
      <div className="mt-6 space-y-3">
        <Button
          className="w-full gradient-button"
          onClick={handleLike}
          disabled={!profile || isFavorited}
        >
          <Heart
            className={`h-4 w-4 mr-2 ${
              isFavorited ? "fill-current text-red-500" : "text-white"
            }`}
          />
          {isFavorited ? "Curtido" : "Curtir Perfil"}
        </Button>

        {matchFound && (
          <div className="text-center text-green-600 font-semibold">
            ✨ Vocês tiveram um match!
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push(`/messages/to/${profile.id}`)}
        >
          Enviar Mensagem
        </Button>
      </div>
    </div>
  )
}