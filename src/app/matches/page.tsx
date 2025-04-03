"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Grid3X3, MessageCircle, Sparkles } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { motion } from "framer-motion"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

export default function MatchesPage() {
  const router = useRouter()

  const profiles = [
    {
      id: 1,
      name: "Ana",
      age: 28,
      gender: "MULHER",
      city: "São Paulo",
      bio: "Adoro música e filmes de aventura.",
      compatibility: 95,
      interests: ["Música", "Cinema", "Viagens"],
      locations: ["shows", "cinemas", "parques"],
      crossMatches: ["Música em shows", "Cinema em cinemas"],
    },
    {
      id: 2,
      name: "Carlos",
      age: 30,
      gender: "HOMEM",
      city: "Rio de Janeiro",
      bio: "Fã de rock e esportes ao ar livre.",
      compatibility: 88,
      interests: ["Esportes", "Rock", "Natureza"],
      locations: ["parques", "natureza", "esportes"],
      crossMatches: ["Esportes em parques"],
    },
    {
      id: 3,
      name: "Juliana",
      age: 26,
      gender: "MULHER",
      city: "Belo Horizonte",
      bio: "Amo viajar e conhecer novas culturas.",
      compatibility: 92,
      interests: ["Fotografia", "Culinária", "Livros"],
      locations: ["museus", "restaurantes", "cafes"],
      crossMatches: ["Fotografia em museus", "Culinária em restaurantes"],
    },
  ]

  const handleViewProfile = (profileId: number) => {
    router.push(`/profile/${profileId}`)
  }

  return (
    <div className="app-container">
      <div className="flex justify-between items-center mb-6">
        <Logo size="md" />
        <div className="flex gap-2">
          <Link href="/messages">
            <Button variant="ghost" size="icon" className="text-oraculo-muted relative">
              <MessageCircle className="h-6 w-6" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-oraculo-purple rounded-full"></span>
            </Button>
          </Link>
          <Link href="/discover">
            <Button variant="ghost" size="icon" className="text-oraculo-muted">
              <Grid3X3 className="h-6 w-6" />
            </Button>
          </Link>
        </div>
      </div>

      <h2 className="text-xl gradient-text mb-8 text-center font-semibold">Seus Matches</h2>

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

                <Button className="gradient-button" onClick={() => handleViewProfile(profile.id)}>
                  Ver perfil
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8">
        <Link href="/matches/swipe">
          <Button className="w-full gradient-button h-14">Modo Deslize</Button>
        </Link>
      </div>
    </div>
  )
}

