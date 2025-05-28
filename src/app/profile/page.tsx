"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { PhotoUpload } from "@/components/photo-upload";
import { Loader2, ChevronLeft, Star, Trash2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Tipos
type Gender = "HOMEM" | "MULHER" | "NAO_BINARIO" | "OUTRO";
type GenderPreference = "HOMEM" | "MULHER" | "TODOS";

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("informacoes");
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isNewProfile, setIsNewProfile] = useState(false);

  const [profileData, setProfileData] = useState({
    name: "",
    birth_date: "",
    gender: "HOMEM" as Gender,
    bio: "",
    city: "",
    profession: "",
    interests: [] as string[],
  });

  const [preferences, setPreferences] = useState({
    genderPreference: "TODOS" as GenderPreference,
    minAge: 18,
    maxAge: 50,
    maxDistance: 50,
    showProfile: true,
    matchNotifications: true,
    messageNotifications: true,
  });

  const { user, profile, isLoading } = useUser();

  // Carrega dados do usuário ao montar o componente
  useEffect(() => {
    console.log("useEffect - User:", user, "Profile:", profile, "IsLoading:", isLoading);
    if (!isLoading && !user) {
      router.push("/login");
    }

    if (profile) {
      setProfileData({
        name: profile.name || "",
        birth_date: profile.birth_date || "",
        gender: profile.gender || "HOMEM",
        bio: profile.bio || "",
        city: profile.city || "",
        profession: profile.profession || "",
        interests: profile.interests || [],
      });

      setPreferences({
        genderPreference: profile.gender_preference || "TODOS",
        minAge: profile.min_age || 18,
        maxAge: profile.max_age || 50,
        maxDistance: profile.max_distance || 50,
        showProfile: profile.show_profile !== false,
        matchNotifications: profile.match_notifications !== false,
        messageNotifications: profile.message_notifications !== false,
      });

      setIsNewProfile(false);
      loadPhotos();
    } else {
      setIsNewProfile(true);
    }
  }, [isLoading, user, profile, router]);

  // Validação de dados do perfil
  const validateProfileData = () => {
    console.log("Validating Profile Data:", profileData);
    if (!profileData.name.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira seu nome completo.",
        variant: "destructive",
      });
      return false;
    }

    if (!profileData.birth_date) {
      toast({
        title: "Erro",
        description: "Por favor, selecione sua data de nascimento.",
        variant: "destructive",
      });
      return false;
    }

    const birthDate = new Date(profileData.birth_date);
    console.log("Birth Date:", birthDate);
    if (isNaN(birthDate.getTime())) {
      toast({
        title: "Erro",
        description: "Data de nascimento inválida.",
        variant: "destructive",
      });
      return false;
    }

    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (age < 18 || (age === 18 && m < 0)) {
      toast({
        title: "Erro",
        description: "Você deve ter pelo menos 18 anos para criar um perfil.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  // Carregar fotos do usuário logado
  const loadPhotos = async () => {
    if (!user) {
      console.log("No user logged in, skipping photo load");
      return;
    }

    try {
      console.log("Loading photos for user:", user.id);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profileData) {
        console.error("Profile fetch error:", profileError);
        throw new Error("Perfil não encontrado");
      }

      const { data: photosData, error: photosError } = await supabase
        .from("profile_photos")
        .select("storage_path, is_primary")
        .eq("profile_id", profileData.id)
        .order("created_at", { ascending: true });

      if (photosError) {
        console.error("Photos fetch error:", photosError);
        throw photosError;
      }

      const photoUrls = await Promise.all(
        photosData.map(async (photo) => {
          const { data: urlData } = supabase
            .storage
            .from("imagens")
            .getPublicUrl(photo.storage_path);

          return {
            name: photo.storage_path.split("/").pop(),
            storage_path: photo.storage_path,
            publicUrl: urlData.publicUrl,
            is_primary: photo.is_primary,
          };
        })
      );

      setPhotos(photoUrls);
      console.log("Photos loaded:", photoUrls);
    } catch (error: any) {
      console.error("Erro ao carregar fotos:", error.message, error);
      toast({
        title: "Erro",
        description: `Não foi possível carregar suas fotos: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Enviar nova foto
  const handlePhotoUpload = async (file: File) => {
    if (!user || !file) {
      toast({ title: "Erro", description: "Usuário ou arquivo ausente.", variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log("Uploading file:", { fileName, filePath, fileSize: file.size });

      const { error: uploadError } = await supabase
        .storage
        .from("imagens")
        .upload(filePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profileData) {
        console.error("Profile fetch error:", profileError);
        throw new Error("Perfil não encontrado");
      }

      const { error: insertError } = await supabase
        .from("profile_photos")
        .insert({
          profile_id: profileData.id,
          storage_path: filePath,
          is_primary: photos.length === 0,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }

      toast({ title: "Sucesso", description: "Foto enviada com sucesso!" });
      await loadPhotos();
    } catch (error: any) {
      console.error("Erro ao enviar foto:", error.message, error);
      toast({
        title: "Erro",
        description: `Não foi possível enviar sua foto: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Excluir foto
  const handleDeletePhoto = async (photoName: string) => {
    if (!user) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }

    try {
      const filePath = `${user.id}/${photoName}`;
      console.log("Deleting photo:", filePath);

      const { error: deleteError } = await supabase
        .storage
        .from("imagens")
        .remove([filePath]);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        throw deleteError;
      }

      const { error: dbError } = await supabase
        .from("profile_photos")
        .delete()
        .eq("storage_path", filePath);

      if (dbError) {
        console.error("DB delete error:", dbError);
        throw dbError;
      }

      toast({ title: "Sucesso", description: "Foto excluída com sucesso." });
      await loadPhotos();
    } catch (error: any) {
      console.error("Erro ao excluir foto:", error.message, error);
      toast({
        title: "Erro",
        description: `Não foi possível remover sua foto: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Definir foto como principal
  const handleSetPrimaryPhoto = async (storagePath: string) => {
    if (!user) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }

    try {
      console.log("Setting primary photo:", storagePath);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profileData) {
        console.error("Profile fetch error:", profileError);
        throw new Error("Perfil não encontrado");
      }

      await supabase
        .from("profile_photos")
        .update({ is_primary: false })
        .eq("profile_id", profileData.id);

      const { error: updateError } = await supabase
        .from("profile_photos")
        .update({ is_primary: true })
        .eq("storage_path", storagePath)
        .eq("profile_id", profileData.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }

      const { data: publicUrl } = supabase.storage
        .from("imagens")
        .getPublicUrl(storagePath);

      const { error: avatarError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl.publicUrl })
        .eq("id", profileData.id);

      if (avatarError) {
        console.error("Avatar update error:", avatarError);
        throw avatarError;
      }

      toast({ title: "Sucesso", description: "Foto principal atualizada!" });
      await loadPhotos();
    } catch (error: any) {
      console.error("Erro ao definir foto principal:", error.message, error);
      toast({
        title: "Erro",
        description: `Não foi possível definir esta foto como principal: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Gerar username único
  const generateUsername = async (name: string) => {
    let baseUsername = '@' + name.toLowerCase().replace(/\s+/g, '');
    let username = baseUsername;
    let counter = 1;

    while (true) {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username)
        .single();

      if (error || !data) break;
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  };

  // Save profile information
  const handleUpdateProfile = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado. Faça login novamente.",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }

    if (!validateProfileData()) {
      return;
    }

    setSaving(true);

    try {
      console.log("Profile Data:", profileData, "Preferences:", preferences);
      const profilePayload = {
        name: profileData.name,
        birth_date: profileData.birth_date,
        gender: profileData.gender,
        bio: profileData.bio,
        city: profileData.city,
        profession: profileData.profession,
        interests: profileData.interests, // Adjust to JSON.stringify if interests is text
        gender_preference: preferences.genderPreference,
        min_age: preferences.minAge,
        max_age: preferences.maxAge,
        max_distance: preferences.maxDistance,
        show_profile: preferences.showProfile,
        match_notifications: preferences.matchNotifications,
        message_notifications: preferences.messageNotifications,
        updated_at: new Date().toISOString(),
      };

      console.log("Profile Payload:", profilePayload);

      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Fetch error:", fetchError);
        throw fetchError;
      }

      let error;

      if (existingProfile) {
        console.log("Updating existing profile for user:", user.id);
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ ...profilePayload, username: await generateUsername(profileData.name) })
          .eq("user_id", user.id);

        error = updateError;
      } else {
        console.log("Inserting new profile for user:", user.id);
        const username = await generateUsername(profileData.name);
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            ...profilePayload,
            user_id: user.id,
            username,
            created_at: new Date().toISOString(),
          });

        error = insertError;
      }

      if (error) {
        console.error("Save error:", error);
        throw error;
      }

      toast({
        title: "Sucesso",
        description: existingProfile
          ? "Seu perfil foi atualizado com sucesso!"
          : "Seu perfil foi criado com sucesso!",
      });

      if (!existingProfile) {
        router.push("/discover");
      }
    } catch (error: any) {
      console.error("Error saving profile:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      toast({
        title: "Erro",
        description: `Não foi possível atualizar seu perfil: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 px-4 py-6">
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

          <TabsContent value="informacoes">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{isNewProfile ? "Criar Perfil" : "Editar Informações"}</CardTitle>
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
                    ) : isNewProfile ? "Criar Perfil" : "Salvar Informações"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
  );
}