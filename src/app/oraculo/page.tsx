"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Grid3X3, MessageCircle, Sparkles, User2Icon, Heart } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { motion } from "framer-motion"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/hooks/use-user"
import Swal from "sweetalert2"
import withReactContent from "sweetalert2-react-content"
import { Loader2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ProfileHeader } from "@/components/profile-header"

const MySwal = withReactContent(Swal)

type Profile = {
  id: string
  avatar_url?: string
  user_id: string
  name: string
  age: number
  gender: string
  city: string
  bio: string
  compatibility: number
  interests: string[]
  crossMatches: string[]
  distance?: number
}

export default function MatchesPage() {
  const router = useRouter()
  const { user, profile, isLoading: userLoading } = useUser()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [availableInterests, setAvailableInterests] = useState<string[]>([])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [hasLikedToday, setHasLikedToday] = useState(false)

  // Fallback image
  const fallbackImage = "/placeholder.svg"

  // Calculate distance using Haversine formula (in kilometers)
  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371 // Earth's radius in km
      const dLat = (lat2 - lat1) * (Math.PI / 180)
      const dLon = (lon2 - lon1) * (Math.PI / 180)
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
          Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c
    },
    []
  )

  // Calculate age from birth date
  const calculateAge = useCallback((birthDate: string): number => {
    if (!birthDate) return 0
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }, [])

  // Check if user has liked today
  const checkDailyLike = useCallback(async () => {
    if (!user || !profile) return
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from("likes")
      .select("id")
      .eq("profile_id", profile.id)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .limit(1)

    if (error) {
      console.error("Error checking daily like:", error)
      return
    }
    setHasLikedToday(!!data?.length)
  }, [user, profile])

  // Fetch available interests
  const fetchInterests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("interests")
        .select("name")
        .order("name", { ascending: true })
      if (error) throw error
      setAvailableInterests(data.map((item) => item.name))
    } catch (error) {
      console.error("Error fetching interests:", error)
    }
  }, [])

  // Fetch compatible profiles
  const fetchCompatibleProfiles = useCallback(async () => {
    if (!user || !profile) return
    setIsLoading(true)
    try {
      if (!profile.gender_preference) {
        MySwal.fire({
          icon: "error",
          title: "Preferências Incompletas",
          html: '<p class="text-lg text-gray-700">Complete suas preferências de gênero para ver matches.</p>',
          customClass: {
            popup: "border-2 border-transparent bg-white rounded-xl",
            title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
            confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
          },
          confirmButtonText: "Ajustar Preferências",
        }).then((result) => {
          if (result.isConfirmed) {
            router.push("/profile")
          }
        })
        return
      }

      let query = supabase
        .from("profiles")
        .select("id, user_id, name, birth_date, gender, bio, city, interests, latitude, longitude, avatar_url")
        .neq("user_id", user.id)
        .in("gender", profile.gender_preference.split(",")) // Assume gender_preference is a comma-separated string
        .limit(3)

      // Apply interests filter if selected
      if (selectedInterests.length > 0) {
        query = query.contains("interests", selectedInterests)
      }

      const { data, error } = await query
      if (error) throw error

      let processedProfiles: Profile[] = []
      if (data && data.length > 0) {
        processedProfiles = data
          .filter((profileData) => {
            // Filter by distance if coordinates are set
            if (
              profile.latitude &&
              profile.longitude &&
              profileData.latitude &&
              profileData.longitude &&
              profile.max_distance
            ) {
              const distance = calculateDistance(
                profile.latitude,
                profile.longitude,
                profileData.latitude,
                profileData.longitude
              )
              return distance <= profile.max_distance
            }
            return true // Include if no coordinates or max_distance
          })
          .map((profileData) => {
            const commonInterests =
              profile.interests?.filter((interest) =>
                profileData.interests?.includes(interest)
              ) || []
            const interestCompatibility =
              profile.interests?.length > 0
                ? Math.round(
                    (commonInterests.length / profile.interests.length) * 100
                  )
                : 0
            const distance =
              profile.latitude &&
              profile.longitude &&
              profileData.latitude &&
              profileData.longitude
                ? calculateDistance(
                    profile.latitude,
                    profile.longitude,
                    profileData.latitude,
                    profileData.longitude
                  )
                : undefined

            return {
              id: profileData.id,
              user_id: profileData.user_id,
              name: profileData.name,
              age: calculateAge(profileData.birth_date),
              gender: profileData.gender,
              city: profileData.city,
              bio: profileData.bio,
              compatibility: interestCompatibility,
              interests: profileData.interests || [],
              crossMatches: commonInterests.map((interest) => interest).slice(0, 3),
              distance,
              avatar_url: profileData.avatar_url,
            }
          })

        // Sort by compatibility, then distance (if available)
        processedProfiles.sort((a, b) => {
          if (b.compatibility !== a.compatibility) {
            return b.compatibility - a.compatibility
          }
          if (a.distance && b.distance) {
            return a.distance - b.distance
          }
          return 0
        })
      }

      setProfiles(processedProfiles.slice(0, 3)) // Ensure max 3 profiles
    } catch (error: any) {
      MySwal.fire({
        icon: "error",
        title: "Erro ao Carregar Perfis",
        html: `<p class="text-lg text-gray-700">Não foi possível carregar os perfis compatíveis. ${error.message}</p>`,
        customClass: {
          popup: "border-2 border-transparent bg-white rounded-xl",
          title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
          confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
        },
        confirmButtonText: "OK",
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, profile, selectedInterests, calculateDistance, calculateAge, router])

  // Handle like action
  const handleLike = async (likedProfileId: string) => {
    if (!user || !profile) {
      MySwal.fire({
        icon: "error",
        title: "Erro",
        html: '<p class="text-lg text-gray-700">Você precisa estar logado para curtir.</p>',
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

    if (hasLikedToday) {
      MySwal.fire({
        icon: "error",
        title: "Limite Diário",
        html: '<p class="text-lg text-gray-700">Você já deu um like hoje. Volte amanhã!</p>',
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
        liked_profile_id: likedProfileId,
        created_at: new Date().toISOString(),
      })
      if (error) throw error

      setHasLikedToday(true)
      MySwal.fire({
        icon: "success",
        title: "Perfil Curtido!",
        html: '<p class="text-lg text-gray-700">Você curtiu o perfil! Aguardando um match...</p>',
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
        .eq("profile_id", likedProfileId)
        .eq("liked_profile_id", profile.id)
        .single()
      if (mutualLikeError && mutualLikeError.code !== "PGRST116") throw mutualLikeError
      if (mutualLikeData) {
        MySwal.fire({
          icon: "success",
          title: "É um Match!",
          html: '<p class="text-lg text-gray-700">Vocês são uma conexão cósmica! Que tal enviar uma mensagem?</p>',
          customClass: {
            popup: "border-2 border-transparent bg-white rounded-xl",
            title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
            confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
          },
          confirmButtonText: "Enviar Mensagem",
        }).then((result) => {
          if (result.isConfirmed) {
            router.push(`/messages/${likedProfileId}`)
          }
        })
      }

      // Remove liked profile from list
      setProfiles(profiles.filter((p) => p.id !== likedProfileId))
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

  // Handle interest filter toggle
  const handleInterestToggle = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    )
  }

  // Handle view profile
  const handleViewProfile = (profileId: string) => {
    router.push(`/profile/${profileId}`)
  }

  // Initial load
  useEffect(() => {
    if (!userLoading && !user) {
      MySwal.fire({
        icon: "warning",
        title: "Acesso Negado",
        html: '<p class="text-lg text-gray-700">Você precisa estar logado para ver matches.</p>',
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

    if (!userLoading && profile) {
      fetchCompatibleProfiles()
      fetchInterests()
      checkDailyLike()
    } else if (!userLoading) {
      MySwal.fire({
        icon: "warning",
        title: "Perfil Incompleto",
        html: '<p class="text-lg text-gray-700">Complete seu perfil para ver matches.</p>',
        customClass: {
          popup: "border-2 border-transparent bg-white rounded-xl",
          title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
          confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
        },
        confirmButtonText: "Completar Perfil",
      }).then((result) => {
        if (result.isConfirmed) {
          router.push("/profile")
        }
      })
    }
  }, [userLoading, user, profile, fetchCompatibleProfiles, fetchInterests, checkDailyLike])

  if (userLoading || isLoading) {
    return (
      <div className="app-container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-oraculo-purple" />
        <p className="text-oraculo-muted mt-4">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 px-4 py-6">
      <ProfileHeader name={profile!.name} avatarUrl={profile!.avatar_url}/>
    
    
      <div className="app-container flex flex-col min-h-screen px-4 py-6">
    

      <h2 className="text-xl font-semibold gradient-text mb-4 text-center">Oráculo</h2>

      {/* Interests Filter */}
      {availableInterests.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Filtrar por Interesses</h3>
          <div className="flex flex-wrap gap-2">
            {availableInterests.map((interest) => (
              <div key={interest} className="flex items-center space-x-2">
                <Checkbox
                  id={interest}
                  checked={selectedInterests.includes(interest)}
                  onCheckedChange={() => handleInterestToggle(interest)}
                />
                <Label htmlFor={interest} className="text-sm text-oraculo-muted">
                  {interest}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {profiles.length > 0 ? (
        <ul className="space-y-6">
          {profiles.map((profile, index) => (
            <motion.li
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <div className="profile-card flex items-center gap-4 p-4 rounded-lg shadow-sm border-none bg-white">
                <div className="w-24 h-32 rounded-lg overflow-hidden">
                  <Image
                    src={profile.avatar_url || fallbackImage}
                    alt={`Foto de ${profile.name}`}
                    width={200}
                    height={300}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      e.currentTarget.src = fallbackImage
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-oraculo-dark text-xl font-semibold">
                      {profile.name}, {profile.age}
                    </h3>
                    <span className="text-sm gradient-text font-semibold">
                      {profile.compatibility}%
                    </span>
                  </div>
                  <p className="text-oraculo-muted text-sm mb-2 line-clamp-2">
                    {profile.bio}
                  </p>
                  {profile.distance && (
                    <p className="text-oraculo-muted text-xs mb-2">
                      {profile.distance.toFixed(1)} km
                    </p>
                  )}

                  {profile.crossMatches.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      <Badge className="bg-oraculo-purple/10 text-oraculo-purple text-xs flex items-center">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {profile.crossMatches[0]}
                      </Badge>
                      {profile.crossMatches.length > 1 && (
                        <Badge className="bg-white text-oraculo-muted text-xs border border-oraculo-purple/20">
                          +{profile.crossMatches.length - 1}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gradient-button"
                      onClick={() => handleViewProfile(profile.id)}
                    >
                      Ver Perfil
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-oraculo-purple text-oraculo-purple"
                      onClick={() => handleLike(profile.id)}
                      disabled={hasLikedToday}
                      aria-label="Curtir perfil"
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Curtir
                    </Button>
                  </div>
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      ) : (
        <div className="profile-card p-6 text-center rounded-lg shadow-sm bg-white">
          <h3 className="text-lg font-semibold text-oraculo-dark mb-4">
            Nenhum Perfil Encontrado
          </h3>
          <p className="text-sm text-oraculo-muted mb-6">
            Não encontramos perfis compatíveis com suas preferências. Ajuste seus
            filtros ou volte mais tarde.
          </p>
          <Button
            className="gradient-button"
            onClick={() => router.push("/profile")}
          >
            Ajustar Preferências
          </Button>
        </div>
      )}

    </div>
    </div>
  )
}