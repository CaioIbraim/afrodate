"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Loader2, ChevronLeft } from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { motion } from "framer-motion"
import { UserProfile, Gender, GenderPreference } from "@/lib/types"
import { useLogout } from "@/lib/auth"

// Interface para estender UserProfile com as propriedades adicionais usadas no componente
interface ExtendedUserProfile extends Partial<UserProfile> {
  profession?: string
  minAge?: number
  maxAge?: number
  maxDistance?: number
  showProfile?: boolean
  matchNotifications?: boolean
  messageNotifications?: boolean
}

export default function ProfilePage() {
  const { user, profile, isLoading } = useUser() // Using useUser without type argument
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("informacoes")
  const [saving, setSaving] = useState(false)
  const { handleLogout } = useLogout();
  // Estados para informações do perfil
  const [profileData, setProfileData] = useState<{
    name: string
    birth_date: string
    gender: Gender
    bio: string
    city: string
    profession: string
    interests: string[]
  }>({
    name: "",
    birth_date: "",
    gender: "HOMEM",
    bio: "",
    city: "",
    profession: "",
    interests: []
  })
  
  // Função para calcular a idade a partir da data de nascimento
  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }
  
  // Estados para preferências
  const [preferences, setPreferences] = useState({
    genderPreference: "TODOS" as GenderPreference,
    minAge: 18,
    maxAge: 50,
    maxDistance: 50,
    showProfile: true,
    matchNotifications: true,
    messageNotifications: true
  })
  
  // Estado para fotos
  const [photos, setPhotos] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
    
    if (profile) {
      // Preencher dados do perfil
      setProfileData({
        name: profile?.name || "",
        birth_date: profile.birth_date || "",
        gender: profile.gender || "HOMEM",
        bio: profile.bio || "",
        city: profile.city || "",
        profession: profile.profession || "",
        interests: profile.interests || []
      })
      
      // Preencher preferências
      setPreferences({
        genderPreference: profile.genderPreference || "TODOS",
        minAge: profile.minAge || 18,
        maxAge: profile.maxAge || 50,
        maxDistance: profile.maxDistance || 50,
        showProfile: profile.showProfile !== false,
        matchNotifications: profile.matchNotifications !== false,
        messageNotifications: profile.messageNotifications !== false
      })
      
      // Carregar fotos
      loadPhotos()
    }
  }, [isLoading, user, profile, router])
  
  const loadPhotos = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .storage
        .from('imagens')
        .list(`${user.id}`, {
          sortBy: { column: 'created_at', order: 'asc' }
        })
      
      if (error) {
        throw error
      }
      
      if (data) {
        const photoUrls = await Promise.all(
          data.map(async (photo) => {
            const { data: url } = supabase
              .storage
              .from('imagens')
              .getPublicUrl(`${user.id}/${photo.name}`)
            
            return {
              name: photo.name,
              url: url.publicUrl,
              id: photo.id
            }
          })
        )
        
        setPhotos(photoUrls)
      }
    } catch (error) {
      console.error("Erro ao carregar fotos:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas fotos.",
        variant: "destructive"
      })
    }
  }
  
  const handleProfileUpdate = async () => {
    if (!user) return
    
    setSaving(true)
    
    try {
      // Mapeando os campos do modelo para o formato do banco de dados
      const { error } = await supabase
        .from('profiles')
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
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
      
      if (error) {
        throw error
      }
      
      toast({
        title: "Sucesso",
        description: "Seu perfil foi atualizado com sucesso!",
      })
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar seu perfil.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }
  
  const handlePhotoUpload = async (file) => {
    if (!user || !file) return
    
    setUploading(true)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`
      
      const { error } = await supabase
        .storage
        .from('imagens')
        .upload(filePath, file)
      
      if (error) {
        throw error
      }
      
      await loadPhotos()
      
      toast({
        title: "Sucesso",
        description: "Foto enviada com sucesso!",
      })
    } catch (error) {
      console.error("Erro ao enviar foto:", error)
      toast({
        title: "Erro",
        description: "Não foi possível enviar sua foto.",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }
  
  const handleDeletePhoto = async (photoName) => {
    if (!user) return
    
    try {
      const { error } = await supabase
        .storage
        .from('imagens')
        .remove([`${user.id}/${photoName}`])
      
      if (error) {
        throw error
      }
      
      await loadPhotos()
      
      toast({
        title: "Sucesso",
        description: "Foto removida com sucesso!",
      })
    } catch (error) {
      console.error("Erro ao remover foto:", error)
      toast({
        title: "Erro",
        description: "Não foi possível remover sua foto.",
        variant: "destructive"
      })
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
    <div className="app-container">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" className="text-oraculo-muted" onClick={() => router.push("/matches")}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Logo size="sm" />
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>
      
      <motion.div className="flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <h3 className="text-2xl font-semibold gradient-text text-center mb-6">Meu Perfil</h3>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="informacoes">Informações</TabsTrigger>
            <TabsTrigger value="fotos">Fotos</TabsTrigger>
            <TabsTrigger value="preferencias">Preferências</TabsTrigger>
          </TabsList>
          
          <TabsContent value="informacoes">
            <div className="profile-card p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input 
                    id="name" 
                    value={profileData.name}
                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Input 
                    id="birth_date" 
                    type="date" 
                    value={profileData.birth_date}
                    onChange={(e) => setProfileData({...profileData, birth_date: e.target.value})}
                  />
                  {profileData.birth_date && (
                    <p className="text-xs text-muted-foreground">
                      Idade: {calculateAge(profileData.birth_date)} anos
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gender">Gênero</Label>
                <Select 
                  value={profileData.gender}
                  onValueChange={(value: Gender) => setProfileData({...profileData, gender: value})}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Selecione seu gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOMEM">Masculino</SelectItem>
                    <SelectItem value="MULHER">Feminino</SelectItem>
                    <SelectItem value="NAO_BINARIO">Não-binário</SelectItem>
                    <SelectItem value="OUTRO">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">Biografia</Label>
                <Textarea 
                  id="bio" 
                  placeholder="Conte um pouco sobre você..." 
                  className="min-h-[120px]"
                  value={profileData.bio}
                  onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Localização</Label>
                  <Input 
                    id="city" 
                    placeholder="Cidade, Estado" 
                    value={profileData.city}
                    onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profession">Profissão</Label>
                  <Input 
                    id="profession" 
                    placeholder="Sua profissão" 
                    value={profileData.profession}
                    onChange={(e) => setProfileData({...profileData, profession: e.target.value})}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleProfileUpdate} 
                disabled={saving}
                className="w-full gradient-button"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : "Salvar Informações"}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="fotos">
            <div className="profile-card p-4">
              <h4 className="text-oraculo-dark text-lg mb-4">Minhas Fotos</h4>
              <p className="text-oraculo-muted mb-4">
                Adicione ou remova fotos do seu perfil. Você pode adicionar até 6 fotos.
              </p>
              
              <div className="mb-6">
                <PhotoUpload 
                  onUpload={handlePhotoUpload} 
                  uploading={uploading}
                  maxFiles={6 - photos.length}
                  disabled={photos.length >= 6 || uploading}
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={photo.url} 
                      alt={`Foto ${index + 1}`} 
                      className="w-full h-48 object-cover rounded-md"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeletePhoto(photo.name)}
                      >
                        Remover
                      </Button>
                    </div>
                    {index === 0 && (
                      <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">
                        Principal
                      </div>
                    )}
                  </div>
                ))}
                
                {photos.length === 0 && (
                  <div className="col-span-3 text-center py-12 border border-dashed rounded-md">
                    <p className="text-muted-foreground">Você ainda não tem fotos. Adicione sua primeira foto!</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="preferencias">
            <div className="profile-card p-4 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="genderPreference">Gênero de Interesse</Label>
                <Select 
                  value={preferences.genderPreference}
                  onValueChange={(value: GenderPreference) => setPreferences({...preferences, genderPreference: value})}
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
                <div>
                  <div className="flex justify-between">
                    <Label htmlFor="idadeRange">Faixa Etária</Label>
                    <span className="text-sm text-muted-foreground">
                      {preferences.minAge} - {preferences.maxAge} anos
                    </span>
                  </div>
                  <div className="pt-4 pb-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>18</span>
                      <span>99</span>
                    </div>
                    <div className="flex gap-4">
                      <Slider
                        id="minAge"
                        min={18}
                        max={preferences.maxAge}
                        step={1}
                        value={[preferences.minAge]}
                        onValueChange={(value) => setPreferences({...preferences, minAge: value[0]})}
                      />
                      <Slider
                        id="maxAge"
                        min={preferences.minAge}
                        max={99}
                        step={1}
                        value={[preferences.maxAge]}
                        onValueChange={(value) => setPreferences({...preferences, maxAge: value[0]})}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between">
                    <Label htmlFor="maxDistance">Distância Máxima</Label>
                    <span className="text-sm text-muted-foreground">
                      {preferences.maxDistance} km
                    </span>
                  </div>
                  <Slider
                    id="maxDistance"
                    min={1}
                    max={150}
                    step={1}
                    value={[preferences.maxDistance]}
                    onValueChange={(value) => setPreferences({...preferences, maxDistance: value[0]})}
                    className="mt-2"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Configurações de Privacidade</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="showProfile" className="text-base">Mostrar meu perfil</Label>
                    <p className="text-sm text-muted-foreground">
                      Quando desativado, seu perfil não será exibido para outros usuários
                    </p>
                  </div>
                  <Switch
                    id="showProfile"
                    checked={preferences.showProfile}
                    onCheckedChange={(checked) => setPreferences({...preferences, showProfile: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="matchNotifications" className="text-base">Notificações de match</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber notificações quando ocorrer um novo match
                    </p>
                  </div>
                  <Switch
                    id="matchNotifications"
                    checked={preferences.matchNotifications}
                    onCheckedChange={(checked) => setPreferences({...preferences, matchNotifications: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="messageNotifications" className="text-base">Notificações de mensagens</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber notificações quando receber novas mensagens
                    </p>
                  </div>
                  <Switch
                    id="messageNotifications"
                    checked={preferences.messageNotifications}
                    onCheckedChange={(checked) => setPreferences({...preferences, messageNotifications: checked})}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleProfileUpdate} 
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
              
              {/* Botão de Logout */}
              <div className="pt-4 border-t border-border mt-4">
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleLogout}
                >
                  Sair da conta
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}