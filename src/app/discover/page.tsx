"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import {
  ChevronLeft,
  Search,
  MapPin,
  Sparkles,
  Filter,
  Heart,
  MessageCircle,
  User2Icon,
} from "lucide-react"
import Image from "next/image"
import { Logo } from "@/components/ui/logo"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { useUser } from "@/hooks/use-user"
import { popularLocations } from "@/components/ui/location-selector"

export default function DiscoverPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("todos")
  const [showLocationFilter, setShowLocationFilter] = useState(false)
  const [showGenderFilter, setShowGenderFilter] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [genderPreference, setGenderPreference] = useState("TODOS")
  const [profiles, setProfiles] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  const { user, profile } = useUser()

  // Busca perfil do usuário logado
  useEffect(() => {
    if (!user) return

    const fetchProfileId = async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .neq("user_id", user.id)

      if (profileData) {
        setCurrentUserId(profileData.id)
      }
    }

    fetchProfileId()
  }, [user])

  // Carrega novos perfis
  const loadProfiles = async (reset = false) => {
    if (!currentUserId) return
  
    try {
      // Primeiro, carrega todos os IDs que o usuário logado já curtiu
      const { data: likesData } = await supabase
        .from("likes")
        .select("liked_profile_id")
        .neq("profile_id", currentUserId)
  
      const likedIds = likesData?.map((like) => like.liked_profile_id) || []
  
      // Monta a query principal
      let query = supabase
        .from("profiles")
        .select(`
          *,
          profile_photos(*)
        `)
        .neq("id", currentUserId)
        .eq("show_profile", true)
      
      // Adiciona filtro de localização e gênero
      if (selectedLocation) {
        query = query.eq("city", selectedLocation)
      }
  
     
      // Paginação
      query = query.range(page * 2, page * 2 + 1)
  
      const { data, error } = await query.order("created_at", { ascending: false })
  
      if (error) throw error
  
      const processedProfiles = await Promise.all(
        data.map(async (p) => {
          const primaryPhoto =
            p.profile_photos.find((ph) => ph.is_primary) || p.profile_photos[0]
          const { publicUrl } = supabase.storage
            .from("imagens")
            .getPublicUrl(primaryPhoto?.storage_path || "")
  
          return {
            ...p,
            avatar_url: publicUrl || "/placeholder.svg",
            age: calculateAge(p.birth_date),
            compatibility: Math.floor(Math.random() * 100),
          }
        })
      )
  
      if (reset) {
        setProfiles(processedProfiles)
      } else {
        setProfiles((prev) => [...prev, ...processedProfiles])
      }
  
      if (processedProfiles.length < 2) {
        setHasMore(false)
      }
  
      setPage((prev) => prev + 1)
    } catch (err: any) {
      console.log("Erro ao carregar perfis:", err.message)
      toast({
        title: "Erro ao carregar perfis",
        description: "Não foi possível buscar novos perfis.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Carrega perfis na primeira vez
  useEffect(() => {
    if (!currentUserId) return

    loadProfiles(true)
  }, [currentUserId, selectedLocation, genderPreference])

  // Calcula idade
  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--
    }
    return age
  }

  // Dar like em um perfil
  const handleLike = async (profileId: string) => {
    if (!currentUserId || !profileId) return

    try {
      const { error } = await supabase
        .from("likes")
        .insert({
          profile_id: currentUserId,
          liked_profile_id: profileId,
        })
        .eq("profile_id", currentUserId)
        .eq("liked_profile_id", profileId)
        .select()
        .single()

      if (error && error.code !== "23505") {
        throw error
      }

      toast({ title: "Curtido!", description: "Você curtiu este perfil." })

      // Verifica se houve match
      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact" })
        .eq("profile_id", profileId)
        .eq("liked_profile_id", currentUserId)

      if (count > 0) {
        toast({
          title: "Match encontrado!",
          description: "Vocês se curtiram mutuamente!",
        })
        router.push(`/messages/to/${profileId}`)
      }

      // Remove da lista após curtir
      setProfiles((prev) => prev.filter((p) => p.id !== profileId))
    } catch (error: any) {
      console.log("Erro ao curtir perfil:", error.message)
      toast({
        title: "Erro",
        description: "Não foi possível curtir esse perfil.",
        variant: "destructive",
      })
    }
  }

  // Carregar mais perfis ao rolar
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom =
      e.currentTarget.scrollHeight - e.currentTarget.scrollTop <=
      e.currentTarget.clientHeight + 100

    if (bottom && hasMore && !loading) {
      loadProfiles()
    }
  }

  // Filtra os perfis com base nos critérios atuais
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      searchTerm === "" || p.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLocation = !selectedLocation || p.city === selectedLocation
    const matchesGender =
      genderPreference === "TODOS" || p.gender === genderPreference

    return matchesSearch && matchesLocation && matchesGender
  })

  if (loading && profiles.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-white rounded-full"></div>
          <p className="mt-4 text-gray-600">Carregando perfis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white shadow-sm px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </Button>
          <Logo size="sm" />
          <div className="flex gap-2">
            <Link href="/matches">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-700 relative"
              >
                <Heart className="h-5 w-5 fill-current" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-purple-500 rounded-full"></span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-700"
           
            >
              <Sparkles className="h-5 w-5" />
            </Button>
            <Link href="/profile">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} alt={profile?.name} />
                <AvatarFallback>{profile?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <section className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-md mx-auto">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar perfis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Abas de filtro */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="proximos">Próximos</TabsTrigger>
              <TabsTrigger value="compatibilidade">Compatibilidade</TabsTrigger>
            </TabsList>
            <TabsContent value="todos">
              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1 text-xs"
                  
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  Localização
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Gênero
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Resultados */}
      <main
        className="max-w-md mx-auto px-4 pb-20 overflow-y-auto"
        onScroll={handleScroll}
      >
        <AnimatePresence>
          {/* Filtro de localização */}
          {showLocationFilter && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-4"
            >
              <h3 className="text-lg font-semibold gradient-text mb-2">
                Localizações populares
              </h3>
              <div className="flex flex-wrap gap-2">
                {popularLocations.map((location) => (
                  <Badge
                    key={location.value}
                    variant={
                      selectedLocation === location.value ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() =>
                      setSelectedLocation(
                        location.value === selectedLocation ? null : location.value
                      )
                    }
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    {location.label}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}

          {/* Filtro de gênero */}
          {showGenderFilter && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-4"
            >
              <h3 className="text-lg font-semibold gradient-text mb-2">
                Gênero
              </h3>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={genderPreference === "HOMEM" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() =>
                    setGenderPreference(
                      genderPreference === "HOMEM" ? "TODOS" : "HOMEM"
                    )
                  }
                >
                  Masculino
                </Badge>
                <Badge
                  variant={genderPreference === "MULHER" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() =>
                    setGenderPreference(
                      genderPreference === "MULHER" ? "TODOS" : "MULHER"
                    )
                  }
                >
                  Feminino
                </Badge>
                <Badge
                  variant={
                    genderPreference === "NAO_BINARIO" ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() =>
                    setGenderPreference(
                      genderPreference === "NAO_BINARIO" ? "TODOS" : "NAO_BINARIO"
                    )
                  }
                >
                  Não Binário
                </Badge>
                <Badge
                  variant={genderPreference === "OUTRO" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() =>
                    setGenderPreference(
                      genderPreference === "OUTRO" ? "TODOS" : "OUTRO"
                    )
                  }
                >
                  Outro
                </Badge>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lista de perfis */}
        <div className="space-y-4">
          {filteredProfiles.length === 0 && !loading ? (
            <div className="profile-card p-6 text-center">
              <h3 className="text-lg font-medium text-gray-700">
                Nenhum perfil encontrado
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                Tente ajustar seus filtros ou volte mais tarde.
              </p>
            </div>
          ) : (
            <>
              {filteredProfiles.map((p) => (
                <Card
                  key={p.id}
                  className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden">
                      <Image
                        src={p.avatar_url}
                        alt={`Foto de ${p.name}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold gradient-text">{p.name}</h3>
                        <span className="text-xs bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-2 py-1 rounded-full">
                          {p.compatibility || 50}%
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{p.city || "Localização não informada"}</span>
                      </div>
                      {p.bio && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {p.bio}
                        </p>
                      )}
                      <div className="flex justify-between mt-4">
                        <Button
                          variant="outline"
                          className="flex-1 text-xs border-oraculo-muted text-oraculo-muted"
                          onClick={() => router.push(`/profile/${p.id}`)}
                        >
                          Ver Perfil
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="ml-2"
                          onClick={() => handleLike(p.id)}
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {loading && (
                <div className="text-center text-gray-500 py-4">
                  Carregando mais perfis...
                </div>
              )}

              {!hasMore && filteredProfiles.length > 0 && (
                <div className="text-center text-gray-500 py-4">
                  Você viu todos os perfis disponíveis!
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}