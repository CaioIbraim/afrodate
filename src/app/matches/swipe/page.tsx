"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState, useRef, useCallback } from "react"
import { ChevronLeft, Heart, X, MapPin, Sparkles } from "lucide-react"
import { motion, type PanInfo, useMotionValue, useTransform } from "framer-motion"
import { Logo } from "@/components/ui/logo"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import type { ProfileData } from "@/lib/types"

const profiles: ProfileData[] = [
  {
    id: 1,
    name: "Ana",
    age: 28,
    gender: "MULHER",
    city: "São Paulo",
    distance: "5km",
    compatibility: 95,
    bio: "Adoro música e filmes de aventura. Sempre em busca de novas experiências.",
    interests: ["Música", "Cinema", "Viagens"],
    locations: ["shows", "cinemas", "parques", "cafes", "festivais"],
    photos: ["/images/female-profile.png"],
    crossMatches: ["Música em shows", "Cinema em cinemas"],
  },
  {
    id: 2,
    name: "Carlos",
    age: 30,
    gender: "HOMEM",
    city: "Rio de Janeiro",
    distance: "12km",
    compatibility: 88,
    bio: "Fã de rock e esportes ao ar livre. Gosto de trilhas e escalada.",
    interests: ["Esportes", "Rock", "Natureza"],
    locations: ["parques", "natureza", "esportes", "shows"],
    photos: ["/images/male-profile-1.png"],
    crossMatches: ["Esportes em parques"],
  },
  {
    id: 3,
    name: "Juliana",
    age: 26,
    gender: "MULHER",
    city: "Belo Horizonte",
    distance: "8km",
    compatibility: 92,
    bio: "Amo viajar e conhecer novas culturas. Fotógrafa nas horas vagas.",
    interests: ["Fotografia", "Culinária", "Livros"],
    locations: ["museus", "restaurantes", "cafes", "livrarias", "mercados"],
    photos: ["/images/female-profile-1.png"],
    crossMatches: ["Fotografia em museus", "Culinária em restaurantes"],
  },
  {
    id: 4,
    name: "Rafael",
    age: 32,
    gender: "HOMEM",
    city: "Curitiba",
    distance: "15km",
    compatibility: 85,
    bio: "Trabalho com tecnologia e adoro jogos. Nas horas vagas gosto de maratonar séries.",
    interests: ["Tecnologia", "Jogos", "Séries"],
    locations: ["cinemas", "shopping", "cafes"],
    photos: ["/images/male-profile-1.png"],
  },
]

export default function SwipePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [exitDirection, setExitDirection] = useState<null | "left" | "right">(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleBackToMatches = useCallback(() => {
    router.push("/matches")
  }, [router])

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      setExitDirection(direction)
      setIsLoading(true)

      if (direction === "right") {
        toast({
          title: "Match!",
          description: `Você curtiu o perfil de ${profiles[currentIndex].name}.`,
        })
      }

      setTimeout(() => {
        setExitDirection(null)
        setIsLoading(false)
        if (currentIndex < profiles.length - 1) {
          setCurrentIndex((prev) => prev + 1)
        } else {
          router.push("/matches")
        }
      }, 300)
    },
    [currentIndex, router, toast]
  )

  return (
    <div className="app-container">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" className="text-oraculo-muted" onClick={handleBackToMatches}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Logo size="sm" />
        <div className="w-10"></div>
      </div>

      <div className="relative w-full h-[70vh] mb-6">
        {profiles.map((profile, index) => (
          <SwipeCard
            key={profile.id}
            profile={profile}
            isActive={index === currentIndex}
            exitDirection={index === currentIndex ? exitDirection : null}
            onSwipe={handleSwipe}
            isLoading={isLoading}
          />
        ))}

        {currentIndex >= profiles.length && (
          <div className="absolute inset-0 flex flex-col items-center justify-center profile-card">
            <h3 className="text-2xl font-semibold gradient-text mb-4">Sem mais perfis</h3>
            <p className="text-oraculo-muted text-center mb-6">
              Você já viu todos os perfis disponíveis. Volte mais tarde para ver novos matches.
            </p>
            <Button className="gradient-button" onClick={handleBackToMatches}>
              Voltar para Matches
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-8">
        <Button
          variant="outline"
          size="icon"
          className="h-16 w-16 rounded-full bg-white border-red-500 text-red-500"
          onClick={() => handleSwipe("left")}
          disabled={isLoading}
        >
          <X className="h-8 w-8" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-16 w-16 rounded-full bg-white border-oraculo-purple text-oraculo-purple"
          onClick={() => handleSwipe("right")}
          disabled={isLoading}
        >
          <Heart className="h-8 w-8" />
        </Button>
      </div>
    </div>
  )
}

interface SwipeCardProps {
  profile: ProfileData
  isActive: boolean
  exitDirection: "left" | "right" | null
  onSwipe: (direction: "left" | "right") => void
  isLoading: boolean
}

function SwipeCard({ profile, isActive, exitDirection, onSwipe, isLoading }: SwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10])

  const likeOpacity = useTransform(x, [0, 100], [0, 1])
  const dislikeOpacity = useTransform(x, [-100, 0], [1, 0])

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (isLoading) return
      if (Math.abs(info.offset.x) > 100) {
        const direction = info.offset.x > 0 ? "right" : "left"
        onSwipe(direction)
      }
    },
    [isLoading, onSwipe]
  )

  if (!isActive && !exitDirection) {
    return null
  }

  return (
    <motion.div
      ref={cardRef}
      className="absolute inset-0 profile-card overflow-hidden"
      style={{ x, rotate }}
      drag={isActive && !isLoading ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={exitDirection ? { x: exitDirection === "left" ? -200 : 200 } : { x: 0 }}
      transition={{ type: "spring", damping: 50, stiffness: 500 }}
    >
      <div className="relative h-full w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="absolute inset-0">
          <motion.img
            src={profile.photos[0]}
            alt={`Foto de ${profile.name}`}
            className="w-full h-full object-cover"
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
          <h2 className="text-2xl font-bold mb-2">
            {profile.name}, {profile.age}
          </h2>
          <div className="flex items-center mb-2">
            <MapPin className="h-4 w-4 mr-1" />
            <span>
              {profile.city} • {profile.distance}
            </span>
          </div>
          {profile.crossMatches && profile.crossMatches.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-oraculo-cyan" />
              <div className="flex flex-wrap gap-1">
                {profile.crossMatches.map((match, index) => (
                  <Badge key={index} className="bg-white/20 text-white text-sm">
                    {match}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <p className="text-sm text-white/80">{profile.bio}</p>
        </div>

        <motion.div
          className="absolute top-8 right-8 rounded-full bg-green-500 p-4"
          style={{ opacity: likeOpacity }}
        >
          <Heart className="h-8 w-8 text-white" />
        </motion.div>

        <motion.div className="absolute top-8 left-8 rounded-full bg-red-500 p-4" style={{ opacity: dislikeOpacity }}>
          <X className="h-8 w-8 text-white" />
        </motion.div>
      </div>
    </motion.div>
  )
}

