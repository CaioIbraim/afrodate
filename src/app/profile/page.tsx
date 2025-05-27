"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/hooks/use-user"
import { PhotoUpload } from "@/components/photo-upload"
import { Loader2, ChevronLeft, Star, Trash2 } from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { motion } from "framer-motion"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

// Tipos
type Gender = "HOMEM" | "MULHER" | "NAO_BINARIO" | "OUTRO"
type GenderPreference = "HOMEM" | "MULHER" | "TODOS"

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("informacoes")
  const [photos, setPhotos] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    name: "",
    birth_date: "",
    gender: "HOMEM" as Gender,
    bio: "",
    city: "",
    profession: "",
    interests: [] as string[],
  })
  const [preferences, setPreferences] = useState({
    genderPreference: "TODOS" as GenderPreference,
    minAge: 18,
    maxAge: 50,
    maxDistance: 50,
    showProfile: true,
    matchNotifications: true,
    messageNotifications: true,
  })

  const { user, profile, isLoading } = useUser()

  // Carrega dados do usuário ao montar o componente
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }

    if (profile) {
      // Preencher dados do perfil
      setProfileData({
        name: profile.name || "",
        birth_date: profile.birth_date || "",
        gender: profile.gender || "HOMEM",
        bio: profile.bio || "",
        city: profile.city || "",
        profession: profile.profession || "",
        interests: profile.interests || [],
      })

      // Preencher preferências
      setPreferences({
        genderPreference: profile.gender_preference || "TODOS",
        minAge: profile.min_age || 18,
        maxAge: profile.max_age || 50,
        maxDistance: profile.max_distance || 50,
        showProfile: profile.show_profile !== false,
        matchNotifications: profile.match_notifications !== false,
        messageNotifications: profile.message_notifications !== false,
      })

      loadPhotos()
    }
  }, [isLoading, user, profile])

  // Carregar fotos do usuário logado
  const loadPhotos = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .storage
        .from("imagens")
        .list(user.id, {
          sortBy: { column: "created_at", order: "asc" },
        })

      if (error) throw error

      const photoUrls = await Promise.all(
        data.map(async (photo) => {
          const { data: urlData } = supabase
            .storage
            .from("imagens")
            .getPublicUrl(`${user.id}/${photo.name}`)

          return {
            name: photo.name,
            storage_path: `${user.id}/${photo.name}`,
            publicUrl: urlData.publicUrl,
            is_primary: false,
          }
        })
      )

      // Marcar foto principal
      const { data: primaryPhoto } = await supabase
        .from("profile_photos")
        .select("storage_path")
        .eq("profile_id", profile?.id)
        .eq("is_primary", true)
        .single()

      const updatedPhotos = photoUrls.map((p) => ({
        ...p,
        is_primary: p.storage_path === primaryPhoto?.storage_path,
      }))

      setPhotos(updatedPhotos)
    } catch (error: any) {
      console.error("Erro ao carregar fotos:", error.message)
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas fotos.",
        variant: "destructive",
      })
    }
  }

  // Enviar nova foto
  const handlePhotoUpload = async (file: File) => {
    if (!user || !file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase
        .storage
        .from("imagens")
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (!profileData) throw new Error("Perfil não encontrado")

      const { error: insertError } = await supabase
        .from("profile_photos")
        .insert({
          profile_id: profileData.id,
          storage_path: filePath,
          is_primary: photos.length === 0,
        })

      if (insertError) throw insertError

      toast({ title: "Sucesso", description: "Foto enviada!" })
      await loadPhotos()
    } catch (error: any) {
      console.error("Erro ao enviar foto:", error.message)
      toast({
        title: "Erro",
        description: "Não foi possível enviar sua foto.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  // Excluir foto
  const handleDeletePhoto = async (photoName: string) => {
    if (!user) return

    try {
      const { error: deleteError } = await supabase
        .storage
        .from("imagens")
        .remove([`${user.id}/${photoName}`])

      if (deleteError) throw deleteError

      // Remover do banco
      await supabase
        .from("profile_photos")
        .delete()
        .eq("storage_path", `${user.id}/${photoName}`)

      toast({ title: "Sucesso", description: "Foto excluída." })
      await loadPhotos()
    } catch (error: any) {
      console.error("Erro ao excluir foto:", error.message)
      toast({
        title: "Erro",
        description: "Não foi possível remover sua foto.",
        variant: "destructive",
      })
    }
  }

  // Definir foto como principal
  const handleSetPrimaryPhoto = async (storagePath: string) => {
    if (!user) return

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (!profileData) throw new Error("Perfil não encontrado")

      // Desativar outras fotos principais
      await supabase
        .from("profile_photos")
        .update({ is_primary: false })
        .eq("profile_id", profileData.id)

      // Ativar a nova foto como principal
      const { error } = await supabase
        .from("profile_photos")
        .update({ is_primary: true })
        .eq("storage_path", storagePath)

      if (error) throw error

      // Gerar URL pública
      const { data: publicUrl } = supabase.storage
        .from("imagens")
        .getPublicUrl(storagePath)

      // Atualizar avatar_url no perfil
      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl.publicUrl })
        .eq("id", profileData.id)

      toast({ title: "Sucesso", description: "Foto principal atualizada!" })
      await loadPhotos()
    } catch (error: any) {
      console.error("Erro ao definir foto principal:", error.message)
      toast({
        title: "Erro",
        description: "Não foi possível definir esta foto como principal.",
        variant: "destructive",
      })
    }
  }

  // Salvar informações do perfil
  const handleUpdateProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: profileData.name,
          birth_date: profileData.birth_date,
          gender: profileData.gender,
          bio: profileData.bio,
          city: profileData.city,
          profession: profileData.profession,
          interests: profileData.interests,
          gender_preference: preferences.genderPreference,
          min_age: preferences.minAge,
          max_age: preferences.maxAge,
          max_distance: preferences.maxDistance,
          show_profile: preferences.showProfile,
          match_notifications: preferences.matchNotifications,
          message_notifications: preferences.messageNotifications,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)

      if (error) throw error

      toast({ title: "Sucesso", description: "Seu perfil foi atualizado!" })
    } catch (error: any) {
      console.error("Erro ao salvar perfil:", error.message)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar seu perfil.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 px-4 py-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </Button>
        <Logo size="sm" />
        <div className="w-10"></div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md mx-auto w-full"
      >
        <h2 className="text-2xl font-bold gradient-text text-center mb-6">Meu Perfil</h2>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Abas */}
          <TabsList className="grid grid-cols-3 w-full rounded-xl bg-white shadow-sm border border-gray-200">
            <TabsTrigger value="informacoes" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Informações
            </TabsTrigger>
            <TabsTrigger value="fotos" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Fotos
            </TabsTrigger>
            <TabsTrigger value="preferencias" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Preferências
            </TabsTrigger>
          </TabsList>

          {/* Aba: Informações */}
          <TabsContent value="informacoes">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Editar Informações</CardTitle>
                <CardDescription>Preencha seus dados pessoais</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center mb-6">
                  {photos.find((p) => p.is_primary)?.publicUrl ? (
                    <Avatar className="w-32 h-32">
                      <AvatarImage src={photos.find((p) => p.is_primary)?.publicUrl} alt={profileData.name} />
                      <AvatarFallback>{profileData.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-500">{profileData.name.charAt(0)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        placeholder="Seu nome"
                        value={profileData.name}
                        onChange={(e) =>
                          setProfileData({ ...profileData, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birth_date">Data de Nascimento</Label>
                      <Input
                        id="birth_date"
                        type="date"
                        value={profileData.birth_date}
                        onChange={(e) =>
                          setProfileData({ ...profileData, birth_date: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gênero</Label>
                    <Select
                      value={profileData.gender}
                      onValueChange={(value: Gender) =>
                        setProfileData({ ...profileData, gender: value })
                      }
                    >
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Selecione seu gênero" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HOMEM">Masculino</SelectItem>
                        <SelectItem value="MULHER">Feminino</SelectItem>
                        <SelectItem value="NAO_BINARIO">Não Binário</SelectItem>
                        <SelectItem value="OUTRO">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Biografia</Label>
                    <Textarea
                      id="bio"
                      placeholder="Conte sobre você..."
                      value={profileData.bio}
                      onChange={(e) =>
                        setProfileData({ ...profileData, bio: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        placeholder="Sua cidade"
                        value={profileData.city}
                        onChange={(e) =>
                          setProfileData({ ...profileData, city: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profession">Profissão</Label>
                      <Input
                        id="profession"
                        placeholder="Sua profissão"
                        value={profileData.profession}
                        onChange={(e) =>
                          setProfileData({ ...profileData, profession: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleUpdateProfile}
                    disabled={saving}
                    className="w-full mt-4 gradient-button"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : "Salvar Informações"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba: Fotos */}
          <TabsContent value="fotos">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Fotos do Perfil</CardTitle>
                <CardDescription>Adicione ou remova fotos do seu perfil</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <PhotoUpload
                    onUpload={handlePhotoUpload}
                    uploading={uploading}
                    maxFiles={6 - photos.length}
                    disabled={photos.length >= 6 || uploading}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo.publicUrl}
                        alt={`Foto ${index + 1}`}
                        className={`w-full h-48 object-cover rounded-md ${
                          photo.is_primary ? "ring-2 ring-purple-500" : ""
                        }`}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
                        {!photo.is_primary && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSetPrimaryPhoto(photo.storage_path)}
                          >
                            <Star className="h-4 w-4 mr-1" /> Principal
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePhoto(photo.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {photo.is_primary && (
                        <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded">
                          Principal
                        </div>
                      )}
                    </div>
                  ))}
                  {photos.length === 0 && (
                    <div className="col-span-3 text-center py-12 border border-dashed rounded-md">
                      <p>Você ainda não tem fotos. Adicione sua primeira foto!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba: Preferências */}
          <TabsContent value="preferencias">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Preferências</CardTitle>
                <CardDescription>Ajuste as preferências do seu perfil</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="genderPreference">Gênero de Interesse</Label>
                    <Select
                      value={preferences.genderPreference}
                      onValueChange={(value: GenderPreference) =>
                        setPreferences({ ...preferences, genderPreference: value })
                      }
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
                        max={preferences.maxAge || 99}
                        step={1}
                        value={[preferences.minAge]}
                        onValueChange={(value) =>
                          setPreferences({ ...preferences, minAge: value[0] })
                        }
                      />
                      <Slider
                        min={preferences.minAge || 18}
                        max={99}
                        step={1}
                        value={[preferences.maxAge]}
                        onValueChange={(value) =>
                          setPreferences({ ...preferences, maxAge: value[0] })
                        }
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
                      onValueChange={(value) =>
                        setPreferences({ ...preferences, maxDistance: value[0] })
                      }
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
                        onCheckedChange={(checked) =>
                          setPreferences({ ...preferences, showProfile: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="matchNotifications" className="text-base">
                          Notificações de Match
                        </Label>
                        <p className="text-sm text-gray-500">
                          Receber notificações quando ocorrer um novo match
                        </p>
                      </div>
                      <Switch
                        id="matchNotifications"
                        checked={preferences.matchNotifications}
                        onCheckedChange={(checked) =>
                          setPreferences({ ...preferences, matchNotifications: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="messageNotifications" className="text-base">
                          Notificações de Mensagens
                        </Label>
                        <p className="text-sm text-gray-500">
                          Receber notificações quando receber novas mensagens
                        </p>
                      </div>
                      <Switch
                        id="messageNotifications"
                        checked={preferences.messageNotifications}
                        onCheckedChange={(checked) =>
                          setPreferences({ ...preferences, messageNotifications: checked })
                        }
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleUpdateProfile}
                    disabled={saving}
                    className="w-full gradient-button"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : "Salvar Preferências"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}