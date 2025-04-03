"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, Search, Filter, Heart, MessageCircle, MapPin, Sparkles, Settings } from "lucide-react"
import Image from "next/image"
import { Logo } from "@/components/ui/logo"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { popularLocations } from "@/components/ui/location-selector"
import { PremiumBadge } from "@/components/ui/premium-badge"
import type { GenderPreference, ProfileData } from "@/lib/types"
import { profilesData } from "@/lib/profile-data"

export default function DiscoverPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("todos")
  const [showLocationFilter, setShowLocationFilter] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [genderPreference, setGenderPreference] = useState<GenderPreference>("TODOS")
  const [showGenderFilter, setShowGenderFilter] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Filter profiles based on search, active tab, location, and gender preference
  const filteredProfiles = profilesData.filter((profile) => {
    const matchesSearch =
      profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.city.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTab =
      activeTab === "todos"
        ? true
        : activeTab === "proximos"
        ? Number.parseInt(profile.distance) <= 10
        : activeTab === "compatibilidade"
        ? profile.compatibility >= 90
        : true

    const matchesLocation = !selectedLocation || profile.locations.includes(selectedLocation)

    const matchesGender =
      genderPreference === "TODOS"
        ? true
        : genderPreference === "HOMEM"
        ? profile.gender === "HOMEM"
        : genderPreference === "MULHER"
        ? profile.gender === "MULHER"
        : true

    return matchesSearch && matchesTab && matchesLocation && matchesGender
  })

  const handleProfileClick = async (profileId: number) => {
    try {
      setIsLoading(true)
      await router.push(`/profile/${profileId}`)
    } catch (error) {
      console.error("Error navigating to profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleLocationFilter = () => {
    setShowLocationFilter(!showLocationFilter)
    setShowGenderFilter(false)
    if (showLocationFilter) {
      setSelectedLocation(null)
    }
  }

  const toggleGenderFilter = () => {
    setShowGenderFilter(!showGenderFilter)
    setShowLocationFilter(false)
  }

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location === selectedLocation ? null : location)
  }

  const handleGenderPreferenceChange = (preference: GenderPreference) => {
    setGenderPreference(preference)
  }

  const handleUpgrade = () => {
    router.push("/subscription")
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-gradient-to-b from-white to-transparent backdrop-blur-sm pb-4">
        <div className="max-w-md mx-auto px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <Link href="/matches">
              <Button variant="ghost" size="icon" className="text-oraculo-muted">
                <ChevronLeft className="h-6 w-6" />
              </Button>
            </Link>

            <Logo size="sm" />

            <div className="flex gap-2">
              <Link href="/messages">
                <Button variant="ghost" size="icon" className="text-oraculo-muted relative">
                  <MessageCircle className="h-6 w-6" />
                  <span className="absolute top-0 right-0 w-2 h-2 bg-oraculo-purple rounded-full"></span>
                </Button>
              </Link>

              <Button variant="ghost" size="icon" className="text-oraculo-muted" onClick={toggleGenderFilter}>
                <Settings className="h-6 w-6" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-oraculo-muted h-4 w-4" />
              <Input
                type="text"
                placeholder="Buscar perfis..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="icon" className="text-oraculo-muted" onClick={toggleLocationFilter}>
              <Filter className="h-6 w-6" />
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="todos" className="flex-1">
                Todos
              </TabsTrigger>
              <TabsTrigger value="proximos" className="flex-1">
                Próximos
              </TabsTrigger>
              <TabsTrigger value="compatibilidade" className="flex-1">
                Compatibilidade
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <AnimatePresence>
            {showLocationFilter && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4"
              >
                <h3 className="text-lg font-semibold gradient-text mb-2">Filtrar por local</h3>
                <div className="flex flex-wrap gap-2">
                  {popularLocations.map((location) => (
                    <Badge
                      key={location.value}
                      variant={selectedLocation === location.value ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleLocationSelect(location.value)}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      {location.label}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}

            {showGenderFilter && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4"
              >
                <h3 className="text-lg font-semibold gradient-text mb-2">Preferência de gênero</h3>
                <div className="flex gap-2">
                  <Button
                    variant={genderPreference === "TODOS" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => handleGenderPreferenceChange("TODOS")}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={genderPreference === "HOMEM" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => handleGenderPreferenceChange("HOMEM")}
                  >
                    Homens
                  </Button>
                  <Button
                    variant={genderPreference === "MULHER" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => handleGenderPreferenceChange("MULHER")}
                  >
                    Mulheres
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-4">
        <div className="grid gap-4">
          {filteredProfiles.map((profile) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="profile-card p-4 cursor-pointer"
              onClick={() => handleProfileClick(profile.id)}
            >
              <div className="flex gap-4">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden">
                  <Image
                    src={profile.photos[0] || "/placeholder.svg"}
                    alt={`Foto de ${profile.name}`}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold gradient-text">
                      {profile.name}, {profile.age}
                    </h3>
                    {profile.isPremium && <PremiumBadge type={profile.contactInfo?.whatsapp ? "vip" : "premium"} />}
                  </div>

                  <div className="flex items-center text-oraculo-muted text-sm mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>
                      {profile.city} • {profile.distance}
                    </span>
                  </div>

                  {profile.crossMatches && profile.crossMatches.length > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-oraculo-purple" />
                      <div className="flex flex-wrap gap-1">
                        {profile.crossMatches.map((match, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {match}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4 text-oraculo-purple" />
                    <span className="text-sm gradient-text font-semibold">{profile.compatibility}% compatível</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {filteredProfiles.length === 0 && (
            <div className="text-center py-8">
              <p className="text-oraculo-muted">Nenhum perfil encontrado com os filtros selecionados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ProfileCardProps {
  profile: {
    id: number
    name: string
    age: number
    gender: string
    city: string
    distance: string
    compatibility: number
    photos: string[]
    crossMatches?: string[]
    isPremium?: boolean
  }
  onClick: () => void
}

function ProfileCard({ profile, onClick }: ProfileCardProps) {
  return (
    <div className="relative rounded-xl overflow-hidden cursor-pointer group card-shadow" onClick={onClick}>
      <div className="aspect-[3/4] relative">
        <Image
          src={profile.photos[0] || "/placeholder.svg"}
          alt={`Foto de ${profile.name}`}
          fill
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent" />

        {profile.isPremium && (
          <div className="absolute top-2 right-2">
            <PremiumBadge size="sm" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-oraculo-dark">
                {profile.name}, {profile.age}
              </h3>
              <p className="text-sm text-oraculo-muted">
                {profile.city} • {profile.distance}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-gradient-to-r from-oraculo-purple/20 to-oraculo-cyan/20 px-2 py-1 rounded-full">
              <Heart className="h-3 w-3 text-oraculo-purple" />
              <span className="text-xs gradient-text font-semibold">{profile.compatibility}%</span>
            </div>
          </div>

          {profile.crossMatches && profile.crossMatches.length > 0 && (
            <div className="mt-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-oraculo-purple" />
              <span className="text-xs text-oraculo-purple">{profile.crossMatches.length} compatibilidades</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

