"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { MessageCircle, Grid3X3, User2Icon, ChevronLeft, Heart } from "lucide-react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Sparkles } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar"

export default function MatchesPage() {
  const router = useRouter()
  const { user, profile, isLoading: userLoading } = useUser()
  const [matchedProfiles, setMatchedProfiles] = useState<any[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const { toast } = useToast()

  // Calcula idade a partir da data de nascimento
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

  // Busca perfis compatíveis
  const fetchMatches = async () => {
    if (!profile?.id || !user) return

    try {
      setLoadingProfiles(true)

      // Encontrar quem curtiu você
      const { data: likesData, error: likesError } = await supabase
        .from("likes")
        .select("profile_id")
        .eq("liked_profile_id", profile.id)

      if (likesError) throw likesError

      const likedUserIds = likesData.map((like) => like.profile_id)

      // Encontrar todos os matches (curtidas mútuas)
      const { data: matchedProfilesData, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          name,
          bio,
          birth_date,
          city,
          gender,
          gender_preference,
          interests,
          avatar_url,
          profile_photos (
            storage_path,
            is_primary
          )
        `)
        .in("id", likedUserIds)
        .neq("id", profile.id)

      if (profilesError) throw profilesError

      // Processar os perfis para adicionar:
      // - avatar_url real via primary photo
      // - idade
      // - interesses em comum
      const enhancedProfiles = await Promise.all(
        matchedProfilesData.map(async (p) => {
          // Se avatar_url estiver vazio, busca foto principal
          let avatarUrl = p.avatar_url
          if (!avatarUrl) {
            const primaryPhoto = p.profile_photos.find((ph) => ph.is_primary)
            if (primaryPhoto) {
              const { data } = supabase.storage
                .from("imagens")
                .getPublicUrl(primaryPhoto.storage_path)
              avatarUrl = data.publicUrl
            }
          }

          // Calcular idade
          const age = calculateAge(p.birth_date)

          // Interesses em comum
          const crossMatches = profile.interests?.filter((interest: string) =>
            p.interests?.includes(interest)
          ) || []

          return {
            ...p,
            avatar_url: avatarUrl || "/placeholder.svg",
            age,
            crossMatches,
          }
        })
      )

      // Ordenar por compatibilidade (idade + localização + interesses)
      const sortedProfiles = enhancedProfiles.sort((a, b) => {
        const scoreA = 
          (a.city === profile.city ? 100 : 70) +
          (a.age >= profile.min_age && a.age <= profile.max_age ? 100 : 50) +
          a.crossMatches.length * 20

        const scoreB = 
          (b.city === profile.city ? 100 : 70) +
          (b.age >= profile.min_age && b.age <= profile.max_age ? 100 : 50) +
          b.crossMatches.length * 20

        return scoreB - scoreA
      })

      setMatchedProfiles(sortedProfiles)
    } catch (error: any) {
      console.log("Erro ao buscar matches:", error.message)
      toast({
        title: "Erro ao carregar perfis",
        description: "Não foi possível carregar seus matches",
        variant: "destructive",
      })
    } finally {
      setLoadingProfiles(false)
    }
  }

  // Carrega perfis compatíveis quando o usuário tiver um perfil completo
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login")
    }

    if (profile) {
      fetchMatches()
    } else if (!userLoading) {
      toast({
        title: "Perfil incompleto",
        description: "Complete seu perfil para ver matches",
        variant: "destructive",
      })
      router.push("/profile")
    }
  }, [user, profile, userLoading])

  if (userLoading || loadingProfiles) {
    return (
      <div className="app-container justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-oraculo-purple" />
        <p className="text-oraculo-muted mt-4">Carregando perfis...</p>
      </div>
    )
  }

  return (
    <div className="app-container">
      
      
      {/* Header */}

      <div className="flex justify-between items-center mb-6">
        <Logo size="md" />
        <div className="flex gap-2">
          <Link href="/messages">
            <Button variant="ghost" size="icon" className="text-oraculo-muted relative">
              <MessageCircle className="h-6 w-6" />
             
            </Button>
          </Link>
          <Link href="/discover">
            <Button variant="ghost" size="icon" className="text-oraculo-muted">
              <Grid3X3 className="h-6 w-6" />
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="text-oraculo-muted relative">
              <User2Icon className="h-6 w-6" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Título */}
      <h2 className="text-xl gradient-text mb-8 text-center font-semibold">
        Seus Matches
      </h2>

      {/* Lista de matches */}
      {matchedProfiles.length > 0 ? (
        <div className="space-y-6">
          {matchedProfiles.map((match, index) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <div className="profile-card flex items-center gap-4 p-4 border rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow">
                <div className="w-24 h-32 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={match.avatar_url || "/placeholder.svg"}
                    alt={`Foto de ${match.name}`}
                    width={200}
                    height={300}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-oraculo-dark text-xl font-medium">
                      {match.name}, {match.age}
                    </h3>
                    <span className="text-sm gradient-text font-semibold">
                      {match.compatibility || 50}%
                    </span>
                  </div>
                  <p className="text-oraculo-muted text-sm mb-2 line-clamp-2">
                    {match.bio || "Sem descrição"}
                  </p>

                  {/* Interesses em comum */}
                  {match.crossMatches && match.crossMatches.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      <Badge className="bg-oraculo-purple/10 text-oraculo-purple text-xs flex items-center">
                        <Sparkles className="h-3 w-3 mr-1" /> {match.crossMatches[0]}
                      </Badge>
                      {match.crossMatches.length > 1 && (
                        <Badge className="bg-white text-oraculo-muted text-xs border border-oraculo-purple/20">
                          +{match.crossMatches.length - 1}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Botão para ver perfil */}
                  <Button
                    className="gradient-button"
                    onClick={() => router.push(`/profile/${match.id}`)}
                  >
                    Ver perfil
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="profile-card p-6 text-center">
          <h3 className="text-xl font-semibold text-oraculo-dark mb-4">
            Nenhum match encontrado
          </h3>
          <p className="text-oraculo-muted mb-6">
            Não encontramos perfis compatíveis com suas preferências no momento.
            Tente ajustar suas preferências ou volte mais tarde.
          </p>
          <Button
            className="gradient-button"
            onClick={() => router.push("/profile")}
          >
            Ajustar preferências
          </Button>
        </div>
      )}

     
    </div>
  )
}