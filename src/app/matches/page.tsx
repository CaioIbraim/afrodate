"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Grid3X3, MessageCircle, Sparkles, User2Icon } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { motion } from "framer-motion"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/hooks/use-user"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

export default function MatchesPage() {
  const router = useRouter()
  const { user, profile, isLoading: userLoading } = useUser()
  const { toast } = useToast()
  const [profiles, setProfiles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar se o usuário está logado
    if (!userLoading && !user) {
      router.push("/login")
      return
    }

    // Buscar perfis compatíveis quando o perfil do usuário estiver carregado
    if (profile) {
      fetchCompatibleProfiles()
    } else if (!userLoading) {
      // Se não há perfil e o carregamento do usuário terminou, redirecionar para o menu
      toast({
        title: "Perfil incompleto",
        description: "Complete seu perfil para ver matches",
        variant: "destructive",
      })
      router.push("/discover/v3")
    }
  }, [user, profile, userLoading, router])

  const fetchCompatibleProfiles = async () => {
    setIsLoading(true)
    try {
      // Verificar se o usuário tem preferências definidas
      if (!profile?.gender_preference) {
        toast({
          title: "Preferências não definidas",
          description: "Complete suas preferências para ver matches",
          variant: "destructive",
        })
        router.push("/discover/v3")
        return
      }

      // Buscar perfis compatíveis do banco de dados
      let query = supabase.from('profiles').select('*')
      
            
      // Filtrar por faixa etária
      // if (profile?.min_age) {
      //   // Assumindo que há um campo age ou calculamos a idade a partir da data de nascimento
      //   query = query.gte('age', profile.min_age)
      // }
      
      // if (profile.max_age) {
      //   query = query.lte('age', profile.max_age)
      // }
      
      // Não mostrar o próprio perfil do usuário
      query = query.neq('user_id', user?.id || '')
      
      // Limitar a 10 perfis
      query = query.limit(10)
      
      const { data, error } = await query
      
      if (error) throw error
      
      if (data && data.length > 0) {
        // Processar os perfis para calcular compatibilidade baseada em interesses comuns
        const processedProfiles = data.map(profileData => {
          // // Calcular interesses em comum
          // const commonInterests = profile.interests.filter(interest => 
          //   profileData.interests && profileData.interests.includes(interest)
          // )
          
          // // Calcular locais em comum
          // const commonLocations = profile.locations ? profile.locations.filter(location => 
          //   profileData.locations && profileData.locations.includes(location)
          // ) : []
          
          // Calcular compatibilidade baseada em interesses comuns (exemplo simples)
          // const interestCompatibility = profile.interests.length > 0 
          //   ? Math.round((commonInterests.length / profile.interests.length) * 100) 
          //   : 0
            
          // Criar "crossMatches" - combinações de interesses e locais
          // const crossMatches = []
          // if (commonInterests.length > 0 && commonLocations.length > 0) {
          //   for (const interest of commonInterests) {
          //     for (const location of commonLocations) {
          //       crossMatches.push(`${interest} em ${location}`)
          //     }
          //   }
          // }
          
          // Definindo valores padrão para as variáveis comentadas
          const interestCompatibility = 0;
          const crossMatches: string[] = [];
          
          return {
            id: profileData.id,
            name: profileData.name,
            age: profileData.age || calculateAge(profileData.birth_date),
            gender: profileData.gender,
            city: profileData.city,
            bio: profileData.bio,
            compatibility: interestCompatibility || 0,
            interests: profileData.interests || [],
            locations: profileData.locations || [],
            crossMatches: crossMatches.slice(0, 3) || [] // Limitar a 3 crossMatches
          }
        })
        
        // Ordenar por compatibilidade
        // processedProfiles.sort((a, b) => b.compatibility - a.compatibility)
        
        setProfiles(processedProfiles)
      } else {
        // Se não há perfis compatíveis
        setProfiles([])
      }
    } catch (error) {
      console.log("Erro ao buscar perfis:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os perfis compatíveis",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Função para calcular idade a partir da data de nascimento
  const calculateAge = (birthDate : any) => {
    if (!birthDate) return 0
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  const handleViewProfile = (profileId: number) => {
    router.push(`/profile/${profileId}`)
  }

  if (userLoading || isLoading) {
    return (
      <div className="app-container justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E1E1E]" />
        <p className="text-oraculo-muted mt-4">Carregando perfis compatíveis...</p>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="flex justify-between items-center mb-6">
        <Logo size="md" />
        <div className="flex gap-2">
          <Link href="/messages">
            <Button variant="ghost" size="icon" className="text-oraculo-muted relative">
              <MessageCircle className="h-6 w-6" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-[#1E1E1E] rounded-full"></span>
            </Button>
          </Link>
          <Link href="/discover/v3">
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

      <h2 className="text-xl gradient-text mb-8 text-center font-semibold">Seus Matches</h2>

      {profiles.length > 0 ? (
        <div className="space-y-6">
          {profiles.map((profile, index) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <div className="profile-card flex items-center gap-4 p-4">
                <div className="w-24 h-32 rounded-lg overflow-hidden">
                  <Image
                    src={
                      profile.gender === "MULHER"
                        ? profile.id % 2 === 0
                          ? "/images/female-profile-1.png"
                          : "/images/female-profile.png"
                        : "/images/male-profile-1.png"
                    }
                    alt={`Foto de ${profile.name}`}
                    width={200}
                    height={300}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-oraculo-dark text-xl">
                      {profile.name}, {profile.age}
                    </h3>
                    <span className="text-sm gradient-text font-semibold">{profile.compatibility}%</span>
                  </div>
                  <p className="text-oraculo-muted text-sm mb-2 line-clamp-2">{profile.bio}</p>

                  {profile.crossMatches && profile.crossMatches.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      <Badge className="bg-[#1E1E1E]/10 text-[#1E1E1E] text-xs flex items-center">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {profile.crossMatches[0]}
                      </Badge>
                      {profile.crossMatches.length > 1 && (
                        <Badge className="bg-white text-oraculo-muted text-xs border border-[#1E1E1E]/20">
                          +{profile.crossMatches.length - 1}
                        </Badge>
                      )}
                    </div>
                  )}

                  <Button className="gradient-button" onClick={() => handleViewProfile(profile.id)}>
                    Ver perfil
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="profile-card p-6 text-center">
          <h3 className="text-xl font-semibold text-oraculo-dark mb-4">Nenhum match encontrado</h3>
          <p className="text-oraculo-muted mb-6">
            Não encontramos perfis compatíveis com suas preferências no momento. Tente ajustar suas preferências ou volte mais tarde.
          </p>
          <Button className="gradient-button" onClick={() => router.push("/profile")}>
            Ajustar preferências
          </Button>
        </div>
      )}

      <div className="mt-8">
        <Link href="/matches/swipe">
          <Button className="w-full gradient-button h-14">Modo Deslize</Button>
        </Link>
      </div>
    </div>
  )
}

