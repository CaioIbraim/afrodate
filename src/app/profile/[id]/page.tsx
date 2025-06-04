"use client"

import { useState, useEffect } from "react"
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
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/hooks/use-user"
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"

// Definindo a interface para os parâmetros da página
interface PageParams {
  params: Promise<{ id: string }>
}

export default async function PublicProfilePage({ params }: PageParams) {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [isFavorited, setIsFavorited] = useState(false)
  const [matchFound, setMatchFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const { user, profile: currentUser } = useUser()
  const currentUserId = currentUser?.id || null

  // Resolver os parâmetros da página
  const resolvedParams = await params
  const profileId = resolvedParams.id

  // Carrega o perfil público
  useEffect(() => {
    const loadPublicProfile = async () => {
      if (!profileId || !currentUserId) return
      if (profileId === currentUserId) {
        router.push("/profile")
        return
      }

      try {
        setLoading(true)

        // Buscar perfil
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", profileId)
          .single()

        if (profileError) throw profileError
        setProfile(profileData)

        // Buscar fotos
        const { data: photosData, error: photosError } = await supabase
          .from("photos")
          .select("*")
          .eq("profile_id", profileId)
          .order("created_at", { ascending: false })

        if (photosError) throw photosError
        setPhotos(photosData || [])

        // Verificar se está nos favoritos
        const { data: favoriteData, error: favoriteError } = await supabase
          .from("favorites")
          .select("*")
          .eq("user_id", currentUserId)
          .eq("favorite_id", profileId)
          .maybeSingle()

        if (favoriteError) throw favoriteError
        setIsFavorited(!!favoriteData)

        // Verificar se há match
        const { data: matchData, error: matchError } = await supabase
          .from("matches")
          .select("*")
          .or(
            `and(user1_id.eq.${currentUserId},user2_id.eq.${profileId}),` +
              `and(user1_id.eq.${profileId},user2_id.eq.${currentUserId})`
          )
          .maybeSingle()

        if (matchError) throw matchError
        setMatchFound(!!matchData)
      } catch (error) {
        console.error("Erro ao carregar perfil:", error)
      } finally {
        setLoading(false)
      }
    }

    loadPublicProfile()
  }, [profileId, currentUserId, router])

  // Função para adicionar/remover dos favoritos
  const toggleFavorite = async () => {
    if (!currentUserId || !profileId) return

    try {
      if (isFavorited) {
        // Remover dos favoritos
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", currentUserId)
          .eq("favorite_id", profileId)

        if (error) throw error
        setIsFavorited(false)
      } else {
        // Adicionar aos favoritos
        const { error } = await supabase.from("favorites").insert({
          user_id: currentUserId,
          favorite_id: profileId,
          created_at: new Date().toISOString(),
        })

        if (error) throw error
        setIsFavorited(true)

        // Verificar se há match (se a outra pessoa também favoritou)
        const { data: otherFavorite, error: favoriteError } = await supabase
          .from("favorites")
          .select("*")
          .eq("user_id", profileId)
          .eq("favorite_id", currentUserId)
          .maybeSingle()

        if (favoriteError) throw favoriteError

        // Se ambos favoritaram, criar um match
        if (otherFavorite && !matchFound) {
          const { error: matchError } = await supabase.from("matches").insert({
            user1_id: currentUserId,
            user2_id: profileId,
            created_at: new Date().toISOString(),
          })

          if (matchError) throw matchError
          setMatchFound(true)
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar favoritos:", error)
    }
  }

  // Iniciar conversa
  const startConversation = () => {
    if (!profileId) return
    router.push(`/messages/to/${profileId}`)
  }

  // Calcular idade
  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-12 w-12 rounded-full border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-2">Perfil não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            O perfil que você está procurando não existe ou foi removido.
          </p>
          <Button onClick={() => router.push("/matches")}>Voltar para Matches</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 pb-20">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label="Voltar"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Button
          variant={isFavorited ? "default" : "outline"}
          size="icon"
          onClick={toggleFavorite}
          className={isFavorited ? "text-white bg-red-500 hover:bg-red-600" : ""}
          aria-label={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          <Heart className={`h-5 w-5 ${isFavorited ? "fill-current" : ""}`} />
        </Button>
      </div>

      {/* Informações do perfil */}
      <div className="flex flex-col items-center mb-6">
        <Avatar className="h-24 w-24 mb-4">
          <AvatarImage src={profile.avatar_url} alt={profile.name} />
          <AvatarFallback>
            {profile.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <h1 className="text-2xl font-bold">
          {profile.name}, {calculateAge(profile.birth_date)}
        </h1>

        <div className="flex items-center mt-2 text-muted-foreground">
          <p>{profile.city || "Cidade não informada"}</p>
          {profile.distance && (
            <>
              <span className="mx-2">•</span>
              <p>A {Math.round(profile.distance)} km</p>
            </>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          {matchFound ? (
            <Button onClick={startConversation} className="bg-emerald-500 hover:bg-emerald-600">
              Enviar Mensagem
            </Button>
          ) : (
            <Button
              onClick={toggleFavorite}
              variant={isFavorited ? "default" : "outline"}
              className={isFavorited ? "bg-red-500 hover:bg-red-600" : ""}
            >
              {isFavorited ? "Favoritado" : "Favoritar"}
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo do perfil */}
      <Tabs defaultValue="about" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="about">Sobre</TabsTrigger>
          <TabsTrigger value="photos">Fotos</TabsTrigger>
          <TabsTrigger value="interests">Interesses</TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sobre {profile.name.split(" ")[0]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Bio</h3>
                <p className="text-muted-foreground">
                  {profile.bio || "Nenhuma biografia informada."}
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Identidade</h3>
                  <p className="text-muted-foreground">
                    {profile.gender === "male"
                      ? "Homem"
                      : profile.gender === "female"
                      ? "Mulher"
                      : "Não informado"}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Orientação</h3>
                  <p className="text-muted-foreground">
                    {profile.orientation === "straight"
                      ? "Heterossexual"
                      : profile.orientation === "gay"
                      ? "Homossexual"
                      : profile.orientation === "bisexual"
                      ? "Bissexual"
                      : "Não informado"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Altura</h3>
                  <p className="text-muted-foreground">
                    {profile.height ? `${profile.height} cm` : "Não informado"}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Educação</h3>
                  <p className="text-muted-foreground">
                    {profile.education || "Não informado"}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-2">Procurando por</h3>
                <p className="text-muted-foreground">
                  {profile.looking_for === "relationship"
                    ? "Relacionamento sério"
                    : profile.looking_for === "casual"
                    ? "Algo casual"
                    : profile.looking_for === "friendship"
                    ? "Amizade"
                    : "Não informado"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Galeria de Fotos</CardTitle>
            </CardHeader>
            <CardContent>
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square overflow-hidden rounded-md"
                    >
                      <Image
                        src={photo.url}
                        alt="Foto do perfil"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma foto disponível.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interests" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Interesses</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.interests && profile.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum interesse informado.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}