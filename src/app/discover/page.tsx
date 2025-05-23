"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, Search, Filter, Heart, MessageCircle, MapPin, Sparkles, Settings, User2Icon } from "lucide-react"
import Image from "next/image"
import { Logo } from "@/components/ui/logo"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { popularLocations } from "@/components/ui/location-selector"
import { PremiumBadge } from "@/components/ui/premium-badge"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

export default function DiscoverPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("todos")
  const [showLocationFilter, setShowLocationFilter] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [genderPreference, setGenderPreference] = useState("TODOS")
  const [showGenderFilter, setShowGenderFilter] = useState(false)
  const [profiles, setProfiles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const searchProfiles = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*, profile_photos(*)')
        .order('created_at', { ascending: false })

      if (error) throw error

      setProfiles(data || [])
    } catch (error) {
      console.error('Error fetching profiles:', error)
      toast({
        title: "Error",
        description: "Failed to load profiles. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    searchProfiles()
  }, [])

  const handleProfileClick = async (profileId: string) => {
    router.push(`/profile/${profileId}`)
  }

  const toggleLocationFilter = () => {
    setShowLocationFilter(!showLocationFilter)
    setShowGenderFilter(false)
  }

  const toggleGenderFilter = () => {
    setShowGenderFilter(!showGenderFilter)
    setShowLocationFilter(false)
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

              <Link href="/profile">
                <Button variant="ghost" size="icon" className="text-oraculo-muted">
                  <User2Icon className="h-6 w-6" />
                </Button>
              </Link>
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
                      onClick={() => setSelectedLocation(location.value === selectedLocation ? null : location.value)}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      {location.label}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-4">
        <div className="grid gap-4">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-oraculo-muted">Carregando perfis...</p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-oraculo-muted">Nenhum perfil encontrado</p>
            </div>
          ) : (
            profiles.map((profile) => (
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
                      src={profile.profile_photos?.[0]?.storage_path || "/placeholder.svg"}
                      alt={`Foto de ${profile.name}`}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold gradient-text">
                        {profile.name}
                      </h3>
                    </div>

                    {profile.city && (
                      <div className="flex items-center text-oraculo-muted text-sm mb-2">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{profile.city}</span>
                      </div>
                    )}

                    {profile.bio && (
                      <p className="text-sm text-oraculo-muted line-clamp-2">{profile.bio}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
