"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Swal from "sweetalert2"
import withReactContent from "sweetalert2-react-content"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/hooks/use-user"
import { Loader2, Star, Trash2, Upload, MapPin, Navigation } from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { motion, AnimatePresence } from "framer-motion"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { v4 as uuidv4 } from "uuid"
import { ProfileHeader } from "@/components/profile-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useDebounce } from "use-debounce"

// Types
type Gender = "HOMEM" | "MULHER" | "NAO_BINARIO" | "OUTRO"
type GenderPreference = "HOMEM" | "MULHER" | "TODOS"
type Photo = {
  name: string
  storage_path: string
  publicUrl: string
  isPrimary: boolean
}
type ProfileData = {
  name: string
  birth_date: string
  gender: Gender
  bio: string
  city: string
  profession: string
  interests: string[]
  latitude?: number | null
  longitude?: number | null
  whatsapp_number?: string
  share_whatsapp?: boolean
}
type Preferences = {
  genderPreference: GenderPreference
  minAge: number
  maxAge: number
  maxDistance: number
  showProfile: boolean
  matchNotifications: boolean
  messageNotifications: boolean
}
type Errors = Record<string, string>
type LocationState = {
  status: "idle" | "requesting" | "granted" | "denied" | "unavailable" | "error"
  latitude: number | null
  longitude: number | null
  error: string | null
  accuracy: number | null
}

// Zodiac Sign Calculation
const getZodiacSign = (birthDate: string): { sign: string; emoji: string } => {
  if (!birthDate) return { sign: "Desconhecido", emoji: "" }
  const date = new Date(birthDate)
  const month = date.getMonth() + 1
  const day = date.getDate()

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return { sign: "Áries", emoji: "♈" }
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return { sign: "Touro", emoji: "♉" }
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return { sign: "Gêmeos", emoji: "♊" }
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return { sign: "Câncer", emoji: "♋" }
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return { sign: "Leão", emoji: "♌" }
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return { sign: "Virgem", emoji: "♍" }
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return { sign: "Libra", emoji: "♎" }
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return { sign: "Escorpião", emoji: "♏" }
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return { sign: "Sagitário", emoji: "♐" }
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return { sign: "Capricórnio", emoji: "♑" }
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return { sign: "Aquário", emoji: "♒" }
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return { sign: "Peixes", emoji: "♓" }
  return { sign: "Desconhecido", emoji: "" }
}

// Profile Completion Calculation
const calculateProfileCompletion = (
  profileData: ProfileData,
  preferences: Preferences,
  photos: Photo[]
): number => {
  const requiredFields: (keyof ProfileData | keyof Preferences)[] = [
    "name",
    "birth_date",
    "gender",
    "bio",
    "city",
    "profession",
    "interests",
    "whatsapp_number",
    "share_whatsapp",
    "genderPreference",
    "minAge",
    "maxAge",
    "maxDistance",
    "showProfile",
    "matchNotifications",
    "messageNotifications",
  ]
  let filledFields = 0
  requiredFields.forEach((field) => {
    if (field in profileData) {
      const value = profileData[field as keyof ProfileData]
      if (field === "interests") {
        if (Array.isArray(value) && value.length > 0) filledFields++
      } else if (typeof value === "string" && value.trim() !== "") {
        filledFields++
      } else if (typeof value === "boolean") {
        filledFields++
      }
    } else if (field in preferences) {
      const value = preferences[field as keyof Preferences]
      if (value !== null && value !== undefined) filledFields++
    }
  })
  if (photos.length > 0) filledFields++
  const totalFields = requiredFields.length + 1 // +1 for photos
  return Math.round((filledFields / totalFields) * 100)
}

// Location Component
const LocationCapture = ({
  profileData,
  setProfileData,
  saving,
  uploading,
  onLocationUpdate,
}: {
  profileData: ProfileData
  setProfileData: (data: ProfileData) => void
  saving: boolean
  uploading: boolean
  onLocationUpdate: (lat: number, lng: number) => void
}) => {
  const [locationState, setLocationState] = useState<LocationState>({
    status: "idle",
    latitude: null,
    longitude: null,
    error: null,
    accuracy: null,
  })

  const isGeolocationSupported = useMemo(() => "geolocation" in navigator, [])

  const checkPermissionStatus = useCallback(async () => {
    if (!isGeolocationSupported) {
      setLocationState((prev) => ({
        ...prev,
        status: "unavailable",
        error: "Geolocalização não é suportada neste dispositivo",
      }))
      return
    }
    try {
      if ("permissions" in navigator) {
        const permission = await navigator.permissions.query({ name: "geolocation" })
        if (permission.state === "granted") {
          getCurrentLocation()
        } else if (permission.state === "denied") {
          setLocationState((prev) => ({
            ...prev,
            status: "denied",
            error: "Permissão de localização foi negada",
          }))
        } else {
          setLocationState((prev) => ({ ...prev, status: "idle" }))
        }
        permission.addEventListener("change", () => {
          if (permission.state === "granted") {
            getCurrentLocation()
          } else if (permission.state === "denied") {
            setLocationState((prev) => ({
              ...prev,
              status: "denied",
              error: "Permissão de localização foi negada",
            }))
          }
        })
      }
    } catch (error) {
      console.error("[checkPermissionStatus] Error:", error)
      setLocationState((prev) => ({
        ...prev,
        status: "error",
        error: "Erro ao verificar permissões de localização",
      }))
    }
  }, [isGeolocationSupported])

  const getCurrentLocation = useCallback(() => {
    if (!isGeolocationSupported) {
      setLocationState((prev) => ({
        ...prev,
        status: "unavailable",
        error: "Geolocalização não é suportada neste dispositivo",
      }))
      return
    }
    setLocationState((prev) => ({ ...prev, status: "requesting", error: null }))
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000,
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setLocationState({
          status: "granted",
          latitude,
          longitude,
          error: null,
          accuracy,
        })
        setProfileData({ ...profileData, latitude, longitude })
        onLocationUpdate(latitude, longitude)
        MySwal.fire({
          icon: "success",
          title: "Localização Capturada!",
          text: `Coordenadas obtidas com precisão de ${Math.round(accuracy || 0)}m`,
          timer: 3000,
          showConfirmButton: false,
          customClass: {
            popup: "border-2 border-transparent bg-white rounded-xl",
            title:
              "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-xl font-bold",
          },
        })
      },
      (error) => {
        console.error("[getCurrentLocation] Error:", error)
        let errorMessage = "Erro desconhecido ao obter localização"
        let status: LocationState["status"] = "error"
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Permissão de localização foi negada pelo usuário"
            status = "denied"
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Localização não disponível no momento"
            status = "unavailable"
            break
          case error.TIMEOUT:
            errorMessage = "Tempo limite excedido para obter localização"
            status = "error"
            break
          default:
            errorMessage = error.message || "Erro ao obter localização"
            status = "error"
            break
        }
        setLocationState((prev) => ({ ...prev, status, error: errorMessage }))
        MySwal.fire({
          icon: "error",
          title: "Erro de Localização",
          text: errorMessage,
          customClass: {
            popup: "border-2 border-transparent bg-white rounded-xl",
            title:
              "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-xl font-bold",
            confirmButton: "bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-white px-4 py-2 rounded shadow",
          },
        })
      },
      options,
    )
  }, [isGeolocationSupported, profileData, setProfileData, onLocationUpdate])

  const requestLocation = useCallback(async () => {
    if (!isGeolocationSupported) {
      await MySwal.fire({
        icon: "error",
        title: "Não Suportado",
        text: "Seu dispositivo não suporta geolocalização",
        customClass: {
          popup: "border-2 border-transparent bg-white rounded-xl",
          title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-xl font-bold",
          confirmButton: "bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-white px-4 py-2 rounded shadow",
        },
      })
      return
    }
    const result = await MySwal.fire({
      icon: "info",
      title: "Permissão de Localização",
      html: `
        <div class="text-left">
          <p class="mb-3">Precisamos da sua localização para:</p>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>Mostrar pessoas próximas a você</li>
            <li>Calcular distâncias precisas</li>
            <li>Melhorar suas recomendações</li>
          </ul>
          <p class="mt-3 text-sm text-gray-500">Sua localização será armazenada de forma segura e você pode removê-la a qualquer momento.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Permitir Localização",
      cancelButtonText: "Agora Não",
      customClass: {
        popup: "border-2 border-transparent bg-white rounded-xl",
        title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-xl font-bold",
        confirmButton: "bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-white px-4 py-2 rounded shadow",
        cancelButton: "bg-gray-200 text-gray-700 px-4 py-2 rounded shadow",
      },
    })
    if (result.isConfirmed) {
      getCurrentLocation()
    }
  }, [isGeolocationSupported, getCurrentLocation])

  const clearLocation = useCallback(async () => {
    const result = await MySwal.fire({
      icon: "question",
      title: "Remover Localização?",
      text: "Isso pode afetar a qualidade das suas recomendações",
      showCancelButton: true,
      confirmButtonText: "Remover",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: "border-2 border-transparent bg-white rounded-xl",
        title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-xl font-bold",
        confirmButton: "bg-red-500 text-white px-4 py-2 rounded shadow",
        cancelButton: "bg-gray-200 text-gray-700 px-4 py-2 rounded shadow",
      },
    })
    if (result.isConfirmed) {
      setLocationState({
        status: "idle",
        latitude: null,
        longitude: null,
        error: null,
        accuracy: null,
      })
      setProfileData({ ...profileData, latitude: null, longitude: null })
      onLocationUpdate(0, 0)
    }
  }, [profileData, setProfileData, onLocationUpdate])

  useEffect(() => {
    checkPermissionStatus()
  }, [checkPermissionStatus])

  useEffect(() => {
    if (profileData.latitude !== undefined && profileData.longitude !== undefined) {
      setLocationState((prev) => ({
        ...prev,
        status: "granted",
        latitude: profileData.latitude ?? null,
        longitude: profileData.longitude ?? null,
      }))
    }
  }, [profileData.latitude, profileData.longitude])

  const renderLocationStatus = () => {
    switch (locationState.status) {
      case "idle":
        return (
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertDescription>Adicione sua localização para encontrar pessoas próximas a você.</AlertDescription>
          </Alert>
        )
      case "requesting":
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Obtendo sua localização... Isso pode levar alguns segundos.</AlertDescription>
          </Alert>
        )
      case "granted":
        return (
          <Alert className="border-green-200 bg-green-50">
            <Navigation className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Localização capturada!</p>
                  {locationState.accuracy && (
                    <p className="text-sm">Precisão: ~{Math.round(locationState.accuracy)}m</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearLocation}
                  disabled={saving || uploading}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remover
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )
      case "denied":
        return (
          <Alert className="border-red-200 bg-red-50">
            <MapPin className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div>
                <p className="font-medium">Permissão de localização negada</p>
                <p className="text-sm mt-1">
                  Para habilitar: vá em Configurações do navegador → Privacidade → Localização
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )
      case "unavailable":
        return (
          <Alert className="border-yellow-200 bg-yellow-50">
            <MapPin className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Geolocalização não está disponível neste dispositivo ou navegador.
            </AlertDescription>
          </Alert>
        )
      case "error":
        return (
          <Alert className="border-red-200 bg-red-50">
            <MapPin className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div>
                <p className="font-medium">Erro ao obter localização</p>
                <p className="text-sm mt-1">{locationState.error}</p>
              </div>
            </AlertDescription>
          </Alert>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-base font-medium">Localização</Label>
        <p className="text-sm text-gray-600">Compartilhe sua localização para encontrar pessoas próximas</p>
      </div>
      {renderLocationStatus()}
      {(locationState.status === "idle" || locationState.status === "error") && (
        <Button
          onClick={requestLocation}
          disabled={saving || uploading || !isGeolocationSupported}
          variant="outline"
          className="w-full"
        >
          <MapPin className="mr-2 h-4 w-4" />
          Capturar Localização
        </Button>
      )}
      {locationState.status === "granted" && (
        <Button onClick={getCurrentLocation} disabled={saving || uploading} variant="outline" className="w-full">
          <Navigation className="mr-2 h-4 w-4" />
          Atualizar Localização
        </Button>
      )}
    </div>
  )
}

// Profile Info Component
const ProfileInfo = ({
  profileData,
  setProfileData,
  errors,
  validateField,
  saving,
  uploading,
  handleUpdateProfile,
  isNewProfile,
  photos,
  handleFileChange,
  calculateAge,
  onLocationUpdate,
}: {
  profileData: ProfileData
  setProfileData: (data: ProfileData) => void
  errors: Errors
  validateField: (field: keyof ProfileData, value: any) => void
  saving: boolean
  uploading: boolean
  handleUpdateProfile: () => void
  isNewProfile: boolean
  photos: Photo[]
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  calculateAge: (birthDate: string) => number | null
  onLocationUpdate: (lat: number, lng: number) => void
}) => {
  const zodiac = getZodiacSign(profileData.birth_date)
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{isNewProfile ? "Criar Perfil" : "Editar Informações"}</CardTitle>
        <CardDescription>Preencha seus dados pessoais e adicione sua foto principal</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col items-center mb-6">
            <label htmlFor="photo-upload" className="relative cursor-pointer group" aria-label="Carregar foto de perfil">
              <Avatar className="w-32 h-32">
                <AvatarImage
                  src={photos.find((p) => p.isPrimary)?.publicUrl || photos[0]?.publicUrl || ""}
                  alt={profileData.name || "Foto de perfil"}
                  className="object-cover"
                  onError={(e: { currentTarget: { src: string } }) => {
                    e.currentTarget.src = "/placeholder-image.png"
                  }}
                />
                <AvatarFallback className="text-2xl">{profileData.name.charAt(0) || "?"}</AvatarFallback>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Upload className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
              </Avatar>
              <input
                id="photo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading || saving}
                aria-describedby="photo-upload-error"
              />
            </label>
            {uploading && (
              <div className="mt-2 w-full max-w-xs">
                <Progress value={uploading ? 50 : 0} className="w-full" aria-label="Progresso do upload" />
                <p className="text-sm text-gray-500 mt-1 text-center">Enviando...</p>
              </div>
            )}
            {errors.photos && (
              <p id="photo-upload-error" className="mt-2 text-sm text-red-500 text-center">
                {errors.photos}
              </p>
            )}
            {calculateAge(profileData.birth_date) && (
              <p className="mt-2 text-sm text-gray-500">
                Idade: {calculateAge(profileData.birth_date)} anos {zodiac.sign !== "Desconhecido" && (
                  <span>({zodiac.emoji} {zodiac.sign})</span>
                )}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="birth_date">Data de Nascimento</Label>
            <Input
              id="birth_date"
              type="date"
              value={profileData.birth_date}
              onChange={(e) => {
                setProfileData({ ...profileData, birth_date: e.target.value })
                validateField("birth_date", e.target.value)
              }}
              className={errors.birth_date ? "border-red-500" : ""}
              disabled={saving || uploading}
              aria-describedby="birth_date-error"
            />
            {errors.birth_date && (
              <p id="birth_date-error" className="text-sm text-red-500">
                {errors.birth_date}
              </p>
            )}
          </div>
          {photos.length > 0 && profileData.birth_date && !errors.birth_date && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Seu nome"
                  value={profileData.name}
                  onChange={(e) => {
                    setProfileData({ ...profileData, name: e.target.value })
                    validateField("name", e.target.value)
                  }}
                  className={errors.name ? "border-red-500" : ""}
                  disabled={saving || uploading}
                  aria-describedby="name-error"
                />
                {errors.name && (
                  <p id="name-error" className="text-sm text-red-500">
                    {errors.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gênero</Label>
                <Select
                  value={profileData.gender}
                  onValueChange={(value: Gender) => setProfileData({ ...profileData, gender: value })}
                  disabled={saving || uploading}
                >
                  <SelectTrigger
                    id="gender"
                    className={errors.gender ? "border-red-500" : ""}
                    aria-describedby="gender-error"
                  >
                    <SelectValue placeholder="Selecione seu gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOMEM">Masculino</SelectItem>
                    <SelectItem value="MULHER">Feminino</SelectItem>
                    <SelectItem value="NAO_BINARIO">Não Binário</SelectItem>
                    <SelectItem value="OUTRO">Outro</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && (
                  <p id="gender-error" className="text-sm text-red-500">
                    {errors.gender}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Biografia</Label>
                <Textarea
                  id="bio"
                  placeholder="Conte sobre você..."
                  value={profileData.bio}
                  onChange={(e) => {
                    setProfileData({ ...profileData, bio: e.target.value })
                    validateField("bio", e.target.value)
                  }}
                  className={errors.bio ? "border-red-500" : ""}
                  disabled={saving || uploading}
                  aria-describedby="bio-error"
                />
                {errors.bio && (
                  <p id="bio-error" className="text-sm text-red-500">
                    {errors.bio}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp_number">WhatsApp</Label>
                <Input
                  id="whatsapp_number"
                  type="text"
                  placeholder="(31) 91234-5678"
                  value={profileData.whatsapp_number || ""}
                  onChange={(e) => {
                    setProfileData({ ...profileData, whatsapp_number: e.target.value })
                    validateField("whatsapp_number", e.target.value)
                  }}
                  disabled={saving || uploading}
                  maxLength={20}
                />
                {errors.whatsapp_number && (
                  <p className="text-red-500 text-xs mt-1">{errors.whatsapp_number}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="share_whatsapp"
                  checked={!!profileData.share_whatsapp}
                  onCheckedChange={(checked) => setProfileData({ ...profileData, share_whatsapp: checked })}
                  disabled={saving || uploading}
                />
                <Label htmlFor="share_whatsapp">Quero compartilhar meu WhatsApp</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    placeholder="Sua cidade"
                    value={profileData.city}
                    onChange={(e) => {
                      setProfileData({ ...profileData, city: e.target.value })
                      validateField("city", e.target.value)
                    }}
                    className={errors.city ? "border-error" : ""}
                    disabled={saving || uploading}
                    aria-describedby="city-error"
                  />
                  {errors.city && (
                    <p id="city-error" className="text-sm text-red-500">
                      {errors.city}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profession">Profissão</Label>
                  <Input
                    id="profession"
                    placeholder="Sua profissão"
                    value={profileData.profession}
                    onChange={(e) => {
                      setProfileData({ ...profileData, profession: e.target.value })
                      validateField("profession", e.target.value)
                    }}
                    className={errors.profession ? "border-red-500" : ""}
                    disabled={saving || uploading}
                    aria-describedby="profession-error"
                  />
                  {errors.profession && (
                    <p id="profession-error" className="text-sm text-red-500">
                      {errors.profession}
                    </p>
                  )}
                </div>
              </div>
              <LocationCapture
                profileData={profileData}
                setProfileData={setProfileData}
                saving={saving}
                uploading={uploading}
                onLocationUpdate={onLocationUpdate}
              />
            </>
          )}
          <Button
            onClick={handleUpdateProfile}
            disabled={saving || uploading || Object.keys(errors).length > 0}
            className="w-full mt-4 bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-white hover:opacity-90 focus:ring-2 focus:ring-[#1E1E1E]"
            aria-label={isNewProfile ? "Criar perfil" : "Salvar informações"}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Salvando...
              </>
            ) : isNewProfile ? (
              "Criar Perfil"
            ) : (
              "Salvar Informações"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Profile Photos Component
const ProfilePhotos = ({
  photos,
  uploading,
  saving,
  handleFileChange,
  handleDeletePhoto,
  handleSetPrimaryPhoto,
}: {
  photos: Photo[]
  uploading: boolean
  saving: boolean
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleDeletePhoto: (photoName: string) => void
  handleSetPrimaryPhoto: (storagePath: string) => void
}) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>Fotos do Perfil</CardTitle>
      <CardDescription>Adicione ou remova suas fotos do seu perfil (máximo 6)</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="mb-6">
        <label htmlFor="photo-upload-secondary" className="block">
          <Button
            asChild
            variant="outline"
            disabled={photos.length >= 6 || uploading || saving}
            className="w-full"
            aria-label="Adicionar uma nova foto"
          >
            <span>
              <Upload className="h-4 w-4 mr-2 inline" aria-hidden="true" />
              Adicionar Foto
            </span>
          </Button>
          <input
            id="photo-upload-secondary"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={photos.length >= 6 || uploading || saving}
            aria-describedby="photo-upload-secondary-error"
          />
        </label>
        {photos.length >= 6 && (
          <p className="mt-2 text-sm text-yellow-500 text-center">
            Limite de 6 fotos atingido. Remova uma foto para adicionar outra.
          </p>
        )}
        {uploading && (
          <div className="mt-2">
            <Progress value={50} className="w-full" aria-label="Progresso do upload" />
            <p className="text-sm text-gray-500 mt-1">Enviando...</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.length === 0 ? (
          <div className="col-span-3 text-center py-12 border border-dashed rounded-md">
            <p>Sem fotos. Adicione sua primeira foto!</p>
          </div>
        ) : (
          photos.map((photo, index) => (
            <div key={photo.storage_path} className="relative group">
              <img
                src={photo.publicUrl || "/placeholder-image.png"}
                alt={`Foto ${index + 1}`}
                className={`w-full h-48 object-cover rounded-md ${photo.isPrimary ? "ring-2 ring-[#1E1E1E]" : ""}`}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder-image.png"
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {!photo.isPrimary && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSetPrimaryPhoto(photo.storage_path)}
                    disabled={uploading || saving}
                    aria-label={`Definir foto ${index + 1} como principal`}
                  >
                    <Star className="h-4 w-4 mr-1" aria-hidden="true" /> Principal
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeletePhoto(photo.name)}
                  disabled={uploading || saving}
                  aria-label={`Excluir foto ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              {photo.isPrimary && (
                <div className="absolute top-2 left-2 bg-[#1E1E1E] text-white text-xs px-2 py-1 rounded">
                  Principal
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </CardContent>
  </Card>
)

// Profile Preferences Component
const ProfilePreferences = ({
  preferences,
  setPreferences,
  saving,
  uploading,
}: {
  preferences: Preferences
  setPreferences: (prefs: Preferences) => void
  saving: boolean
  uploading: boolean
}) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>Preferências</CardTitle>
      <CardDescription>Ajuste suas preferências do seu perfil</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="genderPreference">Gênero de Interesse</Label>
          <Select
            value={preferences.genderPreference}
            onValueChange={(value: GenderPreference) => setPreferences({ ...preferences, genderPreference: value })}
            disabled={saving || uploading}
          >
            <SelectTrigger id="genderPreference">
              <SelectValue placeholder="Selecione o gênero de interesse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HOMEM">Masculino</SelectItem>
              <SelectItem value="MULHER">Feminino</SelectItem>
              <SelectItem value="TODOS">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-4">
          <Label>Idade Mínima e Máxima</Label>
          <div className="flex gap-4">
            <Slider
              min={18}
              max={preferences.maxAge}
              step={1}
              value={[preferences.minAge]}
              onValueChange={(value: number[]) => setPreferences({ ...preferences, minAge: value[0] })}
              disabled={saving || uploading}
              aria-label="Idade mínima"
            />
            <Slider
              min={preferences.minAge}
              max={99}
              step={1}
              value={[preferences.maxAge]}
              onValueChange={(value: number[]) => setPreferences({ ...preferences, maxAge: value[0] })}
              disabled={saving || uploading}
              aria-label="Idade máxima"
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>{preferences.minAge} anos</span>
            <span>{preferences.maxAge} anos</span>
          </div>
        </div>
        <div className="space-y-4">
          <Label>Distância Máxima</Label>
          <Slider
            min={1}
            max={150}
            step={1}
            value={[preferences.maxDistance]}
            onValueChange={(value: number[]) => setPreferences({ ...preferences, maxDistance: value[0] })}
            disabled={saving || uploading}
            aria-label="Distância máxima"
          />
          <div className="flex justify-end text-sm text-gray-500">
            <span>{preferences.maxDistance} km</span>
          </div>
        </div>
        <div className="space-y-4 pt-2 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-700">Configurações de Privacidade</h3>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="showProfile" className="text-base">
                Mostrar meu perfil
              </Label>
              <p className="text-sm text-gray-500">
                Quando desativado, seu perfil não será exibido para outros usuários.
              </p>
            </div>
            <Switch
              id="showProfile"
              checked={preferences.showProfile}
              onCheckedChange={(checked: boolean) => setPreferences({ ...preferences, showProfile: checked })}
              disabled={saving || uploading}
              aria-label="Toggle mostrar perfil"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="matchNotifications" className="text-base">
                Notificações de Match
              </Label>
              <p className="text-sm text-gray-500">Receber notificações quando houver um novo match</p>
            </div>
            <Switch
              id="matchNotifications"
              checked={preferences.matchNotifications}
              onCheckedChange={(checked: boolean) => setPreferences({ ...preferences, matchNotifications: checked })}
              disabled={saving || uploading}
              aria-label="Toggle notificações de match"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="messageNotifications" className="text-base">
                Notificações de Mensagens
              </Label>
              <p className="text-sm text-gray-500">Receber notificações quando receber mensagens novas</p>
            </div>
            <Switch
              id="messageNotifications"
              checked={preferences.messageNotifications}
              onCheckedChange={(checked: boolean) => setPreferences({ ...preferences, messageNotifications: checked })}
              disabled={saving || uploading}
              aria-label="Toggle notificações de mensagens"
            />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)

// Profile Interests Component
const ProfileInterests = ({ interests }: { interests: string[] }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>Meus Interesses</CardTitle>
      <CardDescription>Interesses que você selecionou</CardDescription>
    </CardHeader>
    <CardContent>
      {interests.length === 0 ? (
        <p className="text-gray-600 text-center">Nenhum interesse cadastrado. Adicione interesses na página correspondente.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {interests.map((interest, index) => (
            <span
              key={index}
              className="inline-block bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-white text-sm font-medium px-3 py-1 rounded-full"
            >
              {interest}
            </span>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
)

const MySwal = withReactContent(Swal)

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, isLoading } = useUser()
  const [activeTab, setActiveTab] = useState<"informacoes" | "fotos" | "preferencias" | "interesses">("informacoes")
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isNewProfile, setIsNewProfile] = useState(true)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    birth_date: "",
    gender: "HOMEM",
    bio: "",
    city: "",
    profession: "",
    interests: [],
    latitude: null,
    longitude: null,
    whatsapp_number: "",
    share_whatsapp: false,
  })
  const [preferences, setPreferences] = useState<Preferences>({
    genderPreference: "TODOS",
    minAge: 18,
    maxAge: 50,
    maxDistance: 50,
    showProfile: true,
    matchNotifications: true,
    messageNotifications: true,
  })
  const [debouncedPreferences] = useDebounce(preferences, 1000)

  const showAlert = useCallback(async (type: "success" | "error", titlemillisecond: number) => {
    return MySwal.fire({
      icon: type,
      title : "Perfil Atualizado",
      text : "Seu perfil foi atualizado com sucesso!",
      customClass: {
        popup: "border-2 border-transparent bg-white rounded-xl",
        title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-xl font-bold",
        confirmButton: "bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-white px-4 py-2 rounded shadow",
      },
      willOpen: (popup) => {
        popup.setAttribute("aria-live", "assertive")
      },
    })
  }, [])

  // Auto-save preferences
  useEffect(() => {
    if (!profileId || isNewProfile) return
    const savePreferences = async () => {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            gender_preference: debouncedPreferences.genderPreference,
            min_age: debouncedPreferences.minAge,
            max_age: debouncedPreferences.maxAge,
            max_distance: debouncedPreferences.maxDistance,
            show_profile: debouncedPreferences.showProfile,
            match_notifications: debouncedPreferences.matchNotifications,
            message_notifications: debouncedPreferences.messageNotifications,
          })
          .eq("id", profileId)
        if (error) throw error
      } catch (err) {
        console.error("[savePreferences] Error:", (err as Error).message)
        showAlert("error", "Erro", "Não foi possível salvar suas preferências. Tente novamente.")
      }
    }
    savePreferences()
  }, [debouncedPreferences, profileId, isNewProfile, showAlert])

  const handleLocationUpdate = useCallback(
    async (latitude: number, longitude: number) => {
      if (!user || !profileId) {
        console.log("[handleLocationUpdate] No user or profileId available")
        return
      }
      try {
        console.log("[handleLocationUpdate] Updating location:", { latitude, longitude })
        const updateData =
          latitude === 0 && longitude === 0 ? { latitude: null, longitude: null } : { latitude, longitude }
        const { error } = await supabase.from("profiles").update(updateData).eq("id", profileId)
        if (error) {
          console.error("[handleLocationUpdate] Error:", error.message)
          throw error
        }
        console.log("[handleLocationUpdate] Location updated successfully")
      } catch (error) {
        console.error("[handleLocationUpdate] Error:", (error as Error).message)
        await showAlert("error", "Erro", "Não foi possível atualizar sua localização. Tente novamente.")
      }
    },
    [user, profileId, showAlert],
  )

  const calculateAge = useCallback((birthDate: string): number | null => {
    if (!birthDate) return null
    const birth = new Date(birthDate)
    const today = new Date()
    if (isNaN(birth.getTime()) || birth > today) return null
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age >= 18 ? age : null
  }, [])

  const validateField = useCallback(
    (field: keyof ProfileData, value: any) => {
      const newErrors = { ...errors }
      switch (field) {
        case "name":
          if (!value.trim()) {
            newErrors.name = "O nome é obrigatório."
          } else if (value.length < 2) {
            newErrors.name = "O nome deve ter pelo menos 2 caracteres."
          } else {
            delete newErrors.name
          }
          break
        case "birth_date":
          if (!value) {
            newErrors.birth_date = "A data de nascimento é obrigatória."
          } else {
            const birthDate = new Date(value)
            const today = new Date()
            if (isNaN(birthDate.getTime()) || birthDate > today) {
              newErrors.birth_date = "Data de nascimento inválida."
            } else {
              const age = calculateAge(value)
              if (age === null || age < 18) {
                newErrors.birth_date = "Você deve ter pelo menos 18 anos."
              } else {
                delete newErrors.birth_date
              }
            }
          }
          break
        case "bio":
          if (value.length > 500) {
            newErrors.bio = "A biografia deve ter no máximo 500 caracteres."
          } else {
            delete newErrors.bio
          }
          break
        case "city":
          if (!value.trim()) {
            newErrors.city = "A cidade é obrigatória."
          } else {
            delete newErrors.city
          }
          break
        case "profession":
          if (!value.trim()) {
            newErrors.profession = "A profissão é obrigatória."
          } else {
            delete newErrors.profession
          }
          break
        case "whatsapp_number":
          if (value && !/^\+?\d{10,15}$/.test(value.replace(/\D/g, ""))) {
            newErrors.whatsapp_number = "Número de WhatsApp inválido."
          } else {
            delete newErrors.whatsapp_number
          }
          break
      }
      setErrors(newErrors)
    },
    [errors, calculateAge],
  )

  const isProfileComplete = useMemo(() => {
    return (
      photos.length > 0 &&
      profileData.birth_date &&
      !errors.birth_date &&
      profileData.name.trim() &&
      !errors.name &&
      profileData.gender &&
      profileData.city.trim() &&
      !errors.city &&
      profileData.profession.trim() &&
      !errors.profession &&
      profileData.bio.trim() &&
      !errors.bio &&
      preferences.genderPreference &&
      preferences.minAge >= 18 &&
      preferences.maxAge <= 99 &&
      preferences.maxDistance >= 1
    )
  }, [photos, profileData, errors, preferences])

  const handleLogout = async () => {
    const result = await MySwal.fire({
      title: "Sair?",
      text: "Você deseja realmente sair da sua conta?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sair",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: "border-2 border-transparent bg-white rounded-xl",
        title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-xl font-bold",
        confirmButton: "bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-white px-4 py-2 rounded shadow",
        cancelButton: "bg-gray-200 text-gray-700 px-4 py-2 rounded shadow",
      },
      willOpen: (popup) => {
        popup.setAttribute("aria-live", "assertive")
      },
    })
    if (result.isConfirmed) {
      setSaving(true)
      try {
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.log("[handleLogout] Error:", error.message)
          throw error
        }
        await showAlert("success", "Sucesso", "Você saiu da sua conta com sucesso!")
        router.push("/login")
      } catch (error) {
        console.log("[handleLogout] Error:", (error as Error).message)
        await showAlert(
          "error",
          "Erro",
          (error as Error).message === "too_many_requests"
            ? "Muitas tentativas. Tente novamente em alguns minutos."
            : "Não foi possível sair da sua conta. Tente novamente.",
        )
      } finally {
        setSaving(false)
      }
    }
  }

  useEffect(() => {
    let mounted = true
    const fetchProfileId = async () => {
      try {
        if (!user) {
          console.log("[fetchProfileId] User is null. Cannot fetch profile.")
          setProfileId(null)
          return
        }
        console.log("[fetchProfileId] Fetching profile for user_id:", user.id)
        const { data, error } = await supabase.from("profiles").select("id").eq("user_id", user.id).single()
        if (error && error.code !== "PGRST116") {
          console.log("[fetchProfileId] Error:", error.message)
          throw error
        }
        if (mounted) setProfileId(data?.id || null)
        if (!data) setIsNewProfile(true)
      } catch (error) {
        console.log("[fetchProfileId] Error:", (error as Error).message)
        if (mounted) {
          showAlert(
            "error",
            "Erro",
            (error as Error).message === "too_many_requests"
              ? "Muitas tentativas. Tente novamente em alguns minutos."
              : "Não foi possível carregar o perfil. Tente novamente.",
          )
        }
      }
    }
    fetchProfileId()
    return () => {
      mounted = false
    }
  }, [user, showAlert])

  useEffect(() => {
    let mounted = true
    if (isLoading || !user) return
    if (profile && mounted) {
      setProfileData({
        name: profile.name || "",
        birth_date: profile.birth_date || "",
        gender: profile.gender || "HOMEM",
        bio: profile.bio || "",
        city: profile.city || "",
        profession: profile.profession || "",
        interests: profile.interests || [],
        latitude: profile.latitude || null,
        longitude: profile.longitude || null,
        whatsapp_number: profile.whatsapp_number || "",
        share_whatsapp: profile.share_whatsapp ?? false,
      })
      setPreferences({
        genderPreference: profile.gender_preference || "TODOS",
        minAge: profile.min_age || 18,
        maxAge: profile.max_age || 50,
        maxDistance: profile.max_distance || 50,
        showProfile: profile.show_profile !== false,
        matchNotifications: profile.match_notifications !== false,
        messageNotifications: profile.message_notifications !== false,
      })
      setIsNewProfile(false)
      loadPhotos()
    } else if (profileId === null) {
      setIsNewProfile(true)
      setPhotos([])
    }
    return () => {
      mounted = false
    }
  }, [isLoading, user, profile, profileId, showAlert])

  const loadPhotos = async () => {
    if (!user || !profileId) {
      console.log("[loadPhotos] Skipping: No user or profileId")
      setPhotos([])
      return
    }
    try {
      console.log("[loadPhotos] Fetching photos for profile_id:", profileId)
      const { data: photosData, error: photosError } = await supabase
        .from("profile_photos")
        .select("storage_path, is_primary")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: true })
      if (photosError) {
        console.log("[loadPhotos] Photos error:", photosError.message)
        throw photosError
      }
      const photoUrls = await Promise.all(
        photosData.map(async (photo: { storage_path: string; is_primary: boolean }) => {
          const { data: publicUrlData } = supabase.storage.from("imagens").getPublicUrl(photo.storage_path)
          let url = publicUrlData.publicUrl
          try {
            const response = await fetch(url, { method: "HEAD" })
            if (!response.ok) throw new Error("Public URL inaccessible")
            console.log("[loadPhotos] Public URL accessible:", url)
          } catch {
            console.log("[loadPhotos] Public URL failed, trying signed URL for:", photo.storage_path)
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from("imagens")
              .createSignedUrl(photo.storage_path, 3600)
            if (signedUrlError) throw signedUrlError
            url = signedUrlData.signedUrl
            console.log("[loadPhotos] Signed URL:", url)
          }
          return {
            name: photo.storage_path.split("/").pop()!,
            storage_path: photo.storage_path,
            publicUrl: url,
            isPrimary: photo.is_primary,
          }
        }),
      )
      setPhotos(photoUrls)
    } catch (error) {
      console.log("[loadPhotos] Error:", (error as Error).message)
      showAlert(
        "error",
        "Erro",
        (error as Error).message === "too_many_requests"
          ? "Muitas tentativas. Tente novamente em alguns minutos."
          : "Não foi possível carregar suas fotos. Tente novamente.",
      )
      setPhotos([])
    }
  }

  const compressImage = async (file: File): Promise<File> => {
    try {
      const image = await createImageBitmap(file)
      const canvas = document.createElement("canvas")
      const maxSize = 800
      let width = image.width
      let height = image.height
      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(image, 0, 0, width, height)
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: file.type }))
            } else {
              reject(new Error("Falha ao comprimir imagem"))
            }
          },
          file.type,
          0.8,
        )
      })
    } catch (error) {
      console.log("[compressImage] Error:", (error as Error).message)
      throw error
    }
  }

  const handlePhotoUpload = useCallback(
    async (file: File, uploadId: string) => {
      if (!user || !file) {
        await showAlert("error", "Erro", !user ? "Usuário não autenticado." : "Nenhum arquivo selecionado.")
        return
      }
      const validTypes = ["image/jpeg", "image/png", "image/webp"]
      const maxSize = 5 * 1024 * 1024
      if (!validTypes.includes(file.type)) {
        await showAlert("error", "Erro", "Envie uma imagem nos formatos JPEG, PNG ou WebP.")
        return
      }
      if (file.size > maxSize || file.size === 0) {
        await showAlert(
          "error",
          "Erro",
          file.size > maxSize ? "A imagem deve ter no máximo 5MB." : "O arquivo está vazio ou corrompido.",
        )
        return
      }
      setUploading(true)
      try {
        const compressedFile = await compressImage(file)
        const fileExt = compressedFile.name.split(".").pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
        const filePath = `${user.id}/${fileName}`
        console.log("[handlePhotoUpload] Uploading to:", filePath)
        const { error: uploadError } = await supabase.storage
          .from("imagens")
          .upload(filePath, compressedFile, { contentType: file.type, upsert: false })
        if (uploadError) {
          console.log("[handlePhotoUpload] Upload error:", uploadError.message)
          throw uploadError
        }
        let profileIdToUse = profileId
        if (!profileIdToUse) {
          const username = await generateUsername("user")
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              user_id: user.id,
              username,
              created_at: new Date().toISOString(),
            })
            .select("id")
            .single()
          if (insertError) {
            console.log("[handlePhotoUpload] Profile insert error:", insertError.message)
            throw insertError
          }
          profileIdToUse = newProfile.id
          setProfileId(newProfile.id)
          setIsNewProfile(false)
        }
        const isFirstPhoto = photos.length === 0
        console.log("[handlePhotoUpload] Inserting photo for profile_id:", profileIdToUse, "is_primary:", isFirstPhoto)
        if (!isFirstPhoto) {
          await supabase
            .from("profile_photos")
            .update({ is_primary: false })
            .eq("profile_id", profileIdToUse)
            .eq("is_primary", true)
        }
        const { error: insertError } = await supabase.from("profile_photos").insert({
          profile_id: profileIdToUse,
          storage_path: filePath,
          is_primary: isFirstPhoto,
        })
        if (insertError) {
          console.log("[handlePhotoUpload] Insert error:", insertError.message)
          await supabase.storage.from("imagens").remove([filePath])
          throw insertError
        }
        const { data: urlData } = supabase.storage.from("imagens").getPublicUrl(filePath)
        if (isFirstPhoto) {
          console.log("[handlePhotoUpload] Setting avatar_url:", urlData.publicUrl)
          const { error: avatarError } = await supabase
            .from("profiles")
            .update({ avatar_url: urlData.publicUrl })
            .eq("id", profileIdToUse)
          if (avatarError) {
            console.log("[handlePhotoUpload] Avatar update error:", avatarError.message)
            throw avatarError
          }
        }
        await showAlert("success", "Sucesso", `Foto ${isFirstPhoto ? "principal" : ""} enviada com sucesso!`)
        await loadPhotos()
      } catch (error) {
        console.log("[handlePhotoUpload] Error:", (error as Error).message)
        await showAlert(
          "error",
          "Erro",
          (error as Error).message === "too_many_requests"
            ? "Muitas tentativas. Tente novamente em alguns minutos."
            : (error as Error).message.includes("compress")
            ? "Falha ao comprimir a imagem. Tente outro arquivo."
            : "Não foi possível enviar sua foto. Tente novamente.",
        )
      } finally {
        setUploading(false)
      }
    },
    [user, photos, profileId, showAlert],
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      showAlert("error", "Erro", "Nenhum arquivo selecionado.")
      return
    }
    const uploadId = uuidv4()
    handlePhotoUpload(file, uploadId)
    e.target.value = ""
  }

  const handleDeletePhoto = async (photoName: string) => {
    if (!user || !profileId) {
      await showAlert("error", "Erro", "Usuário ou perfil não encontrado.")
      return
    }
    try {
      const filePath = `${user.id}/${photoName}`
      console.log("[handleDeletePhoto] Deleting:", filePath)
      const { data: photoData, error: photoError } = await supabase
        .from("profile_photos")
        .select("is_primary")
        .eq("storage_path", filePath)
        .eq("profile_id", profileId)
        .single()
      if (photoError) {
        console.log("[handleDeletePhoto] Photo fetch error:", photoError.message)
        throw photoError
      }
      const { error: deleteError } = await supabase.storage.from("imagens").remove([filePath])
      if (deleteError) {
        console.log("[handleDeletePhoto] Delete error:", deleteError.message)
        throw deleteError
      }
      const { error: dbError } = await supabase
        .from("profile_photos")
        .delete()
        .eq("storage_path", filePath)
        .eq("profile_id", profileId)
      if (dbError) {
        console.log("[handleDeletePhoto] DB error:", dbError.message)
        throw dbError
      }
      if (photoData.is_primary) {
        const { data: remainingPhotos } = await supabase
          .from("profile_photos")
          .select("storage_path")
          .eq("profile_id", profileId)
          .order("created_at", { ascending: true })
          .limit(1)
        if (remainingPhotos && remainingPhotos.length > 0) {
          const { error: updatePrimaryError } = await supabase
            .from("profile_photos")
            .update({ is_primary: true })
            .eq("storage_path", remainingPhotos[0].storage_path)
            .eq("profile_id", profileId)
          if (updatePrimaryError) {
            console.log("[handleDeletePhoto] Update primary error:", updatePrimaryError.message)
            throw updatePrimaryError
          }
          const { data: publicUrl } = supabase.storage.from("imagens").getPublicUrl(remainingPhotos[0].storage_path)
          const { error: avatarError } = await supabase
            .from("profiles")
            .update({ avatar_url: publicUrl.publicUrl })
            .eq("id", profileId)
          if (avatarError) {
            console.log("[handleDeletePhoto] Avatar error:", avatarError.message)
            throw avatarError
          }
        } else {
          const { error: avatarError } = await supabase
            .from("profiles")
            .update({ avatar_url: null })
            .eq("id", profileId)
          if (avatarError) {
            console.log("[handleDeletePhoto] Avatar reset error:", avatarError.message)
            throw avatarError
          }
        }
      }
      await showAlert("success", "Sucesso", "Foto excluída com sucesso.")
      await loadPhotos()
    } catch (error) {
      console.log("[handleDeletePhoto] Error:", (error as Error).message)
      await showAlert(
        "error",
        "Erro",
        (error as Error).message === "too_many_requests"
          ? "Muitas tentativas. Tente novamente em alguns minutos."
          : "Não foi possível remover a foto. Tente novamente.",
      )
    }
  }

  const handleSetPrimaryPhoto = async (storagePath: string) => {
    if (!user || !profileId) {
      await showAlert("error", "Erro", "Usuário ou perfil não encontrado.")
      return
    }
    try {
      console.log("[handleSetPrimaryPhoto] Setting primary:", storagePath)
      await supabase.from("profile_photos").update({ is_primary: false }).eq("profile_id", profileId)
      const { error: updateError } = await supabase
        .from("profile_photos")
        .update({ is_primary: true })
        .eq("storage_path", storagePath)
        .eq("profile_id", profileId)
      if (updateError) {
        console.log("[handleSetPrimaryPhoto] Update error:", updateError.message)
        throw updateError
      }
      const { data: publicUrl } = supabase.storage.from("imagens").getPublicUrl(storagePath)
      console.log("[handleSetPrimaryPhoto] Updating avatar_url:", publicUrl.publicUrl)
      const { error: avatarError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl.publicUrl })
        .eq("id", profileId)
      if (avatarError) {
        console.log("[handleSetPrimaryPhoto] Avatar error:", avatarError.message)
        throw avatarError
      }
      await showAlert("success", "Sucesso", "Foto principal atualizada!")
      await loadPhotos()
    } catch (error) {
      console.log("[handleSetPrimaryPhoto] Error:", (error as Error).message)
      await showAlert(
        "error",
        "Erro",
        (error as Error).message === "too_many_requests"
          ? "Muitas tentativas. Tente novamente em alguns minutos."
          : "Não foi possível definir esta foto como principal. Tente novamente.",
      )
    }
  }

  const generateUsername = async (name: string): Promise<string> => {
    const baseUsername = "@" + name.toLowerCase().replace(/\s+/g, "")
    let username = baseUsername
    let counter = 1
    while (true) {
      const { data, error } = await supabase.from("profiles").select("username").eq("username", username).single()
      if (error || !data) break
      username = `${baseUsername}${counter}`
      counter++
    }
    return username
  }

  const handleUpdateProfile = useCallback(async () => {
    if (!user || !validateProfileData()) {
      await showAlert(
        "error",
        "Erro",
        !user ? "Usuário não autenticado." : "Por favor, corrija os erros nos campos antes de salvar.",
      )
      return
    }
    setSaving(true)
    try {
      const profilePayload = {
        name: profileData.name,
        birth_date: profileData.birth_date,
        gender: profileData.gender,
        bio: profileData.bio,
        city: profileData.city,
        profession: profileData.profession,
        interests: profileData.interests,
        latitude: profileData.latitude,
        longitude: profileData.longitude,
        whatsapp_number: profileData.whatsapp_number || null,
        share_whatsapp: profileData.share_whatsapp ?? false,
        updated_at: new Date().toISOString(),
        avatar_url: photos.find((p) => p.isPrimary)?.publicUrl || photos[0]?.publicUrl || null,
      }
      console.log("[handleUpdateProfile] Saving profile:", profilePayload)
      let error
      if (profileId) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ ...profilePayload, username: await generateUsername(profileData.name) })
          .eq("id", profileId)
        error = updateError
      } else {
        const username = await generateUsername(profileData.name)
        const { data, error: insertError } = await supabase
          .from("profiles")
          .insert({
            ...profilePayload,
            user_id: user.id,
            username,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single()
        error = insertError
        if (data) setProfileId(data.id)
        setIsNewProfile(false)
      }
      if (error) {
        console.log("[handleUpdateProfile] Save error:", error.message)
        throw error
      }
      await showAlert("success", "Sucesso", profileId ? "Perfil atualizado com sucesso!" : "Perfil criado com sucesso!")
      if (!profileId) {
        await loadPhotos()
        router.push("/dashboard")
      }
    } catch (error) {
      console.log("[handleUpdateProfile] Error:", (error as Error).message)
      await showAlert(
        "error",
        "Erro",
        (error as Error).message === "too_many_requests"
          ? "Muitas tentativas. Tente novamente em alguns minutos."
          : "Não foi possível salvar seu perfil. Tente novamente.",
      )
    } finally {
      setSaving(false)
    }
  }, [user, profileData, photos, profileId, showAlert, router])

  const validateProfileData = useCallback(() => {
    const newErrors: Errors = {}
    if (!profileData.birth_date) {
      newErrors.birth_date = "A data de nascimento é obrigatória."
    } else {
      const age = calculateAge(profileData.birth_date)
      if (age === null || age < 18) {
        newErrors.birth_date = "Você deve ter pelo menos 18 anos."
      }
    }
    if (isNewProfile && photos.length === 0) {
      newErrors.photos = "É necessário adicionar pelo menos uma foto para criar o perfil."
    }
    if (!isNewProfile || (photos.length > 0 && profileData.birth_date && !errors.birth_date)) {
      if (!profileData.name.trim()) {
        newErrors.name = "O nome é obrigatório."
      }
      if (!profileData.city.trim()) {
        newErrors.city = "A cidade é obrigatória."
      }
      if (!profileData.profession.trim()) {
        newErrors.profession = "A profissão é obrigatória."
      }
      if (profileData.bio.length > 500) {
        newErrors.bio = "A biografia deve ter no máximo 500 caracteres."
      }
      if (profileData.whatsapp_number && !/^\+?\d{10,15}$/.test(profileData.whatsapp_number.replace(/\D/g, ""))) {
        newErrors.whatsapp_number = "Número de WhatsApp inválido."
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [profileData, photos, isNewProfile, errors, calculateAge])

  const profileCompletion = useMemo(
    () => calculateProfileCompletion(profileData, preferences, photos),
    [profileData, preferences, photos]
  )

  if (isLoading || profileId === null) {
    return (
      <div className="flex items-center justify-center h-screen" aria-label="Carregando">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
       <ProfileHeader name={profile!.name} avatarUrl={profile!.avatar_url} />
       
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E]">
            {isNewProfile ? "Criar Seu Perfil" : "Editar Perfil"}
          </h1>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Completude do Perfil</span>
              <span className="text-sm font-bold text-oraculo-cyan">{profileCompletion}%</span>
            </div>
            <Progress
              value={profileCompletion}
              className="w-full h-2"
              aria-label={`Progresso de completude do perfil: ${profileCompletion}%`}
            />
          </div>
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "informacoes" | "fotos" | "preferencias" | "interesses")
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 mb-6 bg-gray-200 rounded-lg p-1">
              <TabsTrigger
                value="informacoes"
                className="text-sm data-[state=active]:bg-white data-[state=active]:text-oraculo-cyan"
                aria-label="Informações do perfil"
              >
                Informações
              </TabsTrigger>
              <TabsTrigger
                value="fotos"
                className="text-sm data-[state=active]:bg-white data-[state=active]:text-oraculo-cyan"
                aria-label="Fotos do perfil"
              >
                Fotos
              </TabsTrigger>
              <TabsTrigger
                value="preferencias"
                className="text-sm data-[state=active]:bg-white data-[state=active]:text-oraculo-cyan"
                aria-label="Preferências do perfil"
              >
                Preferências
              </TabsTrigger>
              <TabsTrigger
                value="interesses"
                className="text-sm data-[state=active]:bg-white data-[state=active]:text-oraculo-cyan"
                aria-label="Interesses do perfil"
              >
                Interesses
              </TabsTrigger>
            </TabsList>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <TabsContent value="informacoes">
                  <ProfileInfo
                    profileData={profileData}
                    setProfileData={setProfileData}
                    errors={errors}
                    validateField={validateField}
                    saving={saving}
                    uploading={uploading}
                    handleUpdateProfile={handleUpdateProfile}
                    isNewProfile={isNewProfile}
                    photos={photos}
                    handleFileChange={handleFileChange}
                    calculateAge={calculateAge}
                    onLocationUpdate={handleLocationUpdate}
                  />
                </TabsContent>
                <TabsContent value="fotos">
                  <ProfilePhotos
                    photos={photos}
                    uploading={uploading}
                    saving={saving}
                    handleFileChange={handleFileChange}
                    handleDeletePhoto={handleDeletePhoto}
                    handleSetPrimaryPhoto={handleSetPrimaryPhoto}
                  />
                </TabsContent>
                <TabsContent value="preferencias">
                  <ProfilePreferences
                    preferences={preferences}
                    setPreferences={setPreferences}
                    saving={saving}
                    uploading={uploading}
                  />
                </TabsContent>
                <TabsContent value="interesses">
                  <ProfileInterests interests={profileData.interests} />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </main>
    </div>
  )
}