"use client";

import type React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase"; // Adjust path as needed
import { Loader2, Star, Trash2, Upload, ArrowRight, MapPin, Navigation } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { v4 as uuidv4 } from "uuid";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IMaskInput } from "react-imask";

// Types
type Gender = "HOMEM" | "MULHER" | "NAO_BINARIO" | "OUTRO";
type GenderPreference = "HOMEM" | "MULHER" | "TODOS";
type Photo = {
  name: string;
  storage_path: string;
  publicUrl: string;
  isPrimary: boolean;
};
type ProfileData = {
  name: string;
  birth_date: string;
  gender: Gender;
  bio: string;
  city: string;
  profession: string;
  interests: string[];
  latitude?: number | null;
  longitude?: number | null;
  whatsapp: string | null;
};
type Preferences = {
  genderPreference: GenderPreference;
  minAge: number;
  maxAge: number;
  maxDistance: number;
  showProfile: boolean;
  matchNotifications: boolean;
  messageNotifications: boolean;
  showWhatsApp: boolean;
};
type Errors = Record<string, string>;
type LocationState = {
  status: "idle" | "requesting" | "granted" | "denied" | "unavailable" | "error";
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  accuracy: number | null;
};

// Notification Center Component
const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false });
      setNotifications(data || []);
    };

    fetchNotifications();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        async (payload) => {
          const user = await supabase.auth.getUser();
          if (payload.new.user_id === user.data.user?.id) {
            setNotifications((prev) => [payload.new, ...prev]);
            toast.info(payload.new.message, {
              position: "top-center",
              autoClose: 3000,
              theme: "light",
              style: {
                background: "white",
                border: "2px solid transparent",
                borderRadius: "0.75rem",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="mt-4 space-y-2" aria-live="polite">
      <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan">
        Notificações
      </h3>
      {notifications.length === 0 ? (
        <p className="text-gray-500">Sem notificações ainda.</p>
      ) : (
        notifications.map((notification) => (
          <div
            key={notification.id}
            className="p-3 border rounded bg-white shadow-sm"
          >
            <p className="text-sm">{notification.message}</p>
            <p className="text-xs text-gray-400">
              {new Date(notification.created_at).toLocaleString("pt-BR")}
            </p>
          </div>
        ))
      )}
    </div>
  );
};

// Location Component
const LocationCapture = ({
  profileData,
  setProfileData,
  saving,
  uploading,
  onLocationUpdate,
}: {
  profileData: ProfileData;
  setProfileData: (data: ProfileData) => void;
  saving: boolean;
  uploading: boolean;
  onLocationUpdate: (lat: number, lng: number) => void;
}) => {
  const [locationState, setLocationState] = useState<LocationState>({
    status: "idle",
    latitude: null,
    longitude: null,
    error: null,
    accuracy: null,
  });

  const isGeolocationSupported = useMemo(() => "geolocation" in navigator, []);

  const checkPermissionStatus = useCallback(async () => {
    if (!isGeolocationSupported) {
      setLocationState((prev) => ({
        ...prev,
        status: "unavailable",
        error: "Geolocalização não é suportada neste dispositivo",
      }));
      return;
    }

    try {
      if ("permissions" in navigator) {
        const permission = await navigator.permissions.query({ name: "geolocation" });
        if (permission.state === "granted") {
          getCurrentLocation();
        } else if (permission.state === "denied") {
          setLocationState((prev) => ({
            ...prev,
            status: "denied",
            error: "Permissão de localização foi negada",
          }));
        } else {
          setLocationState((prev) => ({ ...prev, status: "idle" }));
        }
        permission.addEventListener("change", () => {
          if (permission.state === "granted") {
            getCurrentLocation();
          } else if (permission.state === "denied") {
            setLocationState((prev) => ({
              ...prev,
              status: "denied",
              error: "Permissão de localização foi negada",
            }));
          }
        });
      }
    } catch (error) {
      console.error("[checkPermissionStatus] Error:", error);
      setLocationState((prev) => ({
        ...prev,
        status: "error",
        error: "Erro ao verificar permissões de localização",
      }));
    }
  }, [isGeolocationSupported]);

  const getCurrentLocation = useCallback(() => {
    if (!isGeolocationSupported) {
      setLocationState((prev) => ({
        ...prev,
        status: "unavailable",
        error: "Geolocalização não é suportada neste dispositivo",
      }));
      return;
    }

    setLocationState((prev) => ({ ...prev, status: "requesting", error: null }));

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocationState({
          status: "granted",
          latitude,
          longitude,
          error: null,
          accuracy,
        });
        setProfileData({
          ...profileData,
          latitude,
          longitude,
        });
        onLocationUpdate(latitude, longitude);
        toast.success(`Localização capturada com precisão de ${Math.round(accuracy || 0)}m`, {
          position: "top-center",
          autoClose: 3000,
          theme: "light",
          style: {
            background: "white",
            border: "2px solid transparent",
            borderRadius: "0.75rem",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }
        });
      },
      (error) => {
        console.error("[getCurrentLocation] Error:", error);
        let errorMessage = "Erro desconhecido ao obter localização";
        let status: LocationState["status"] = "error";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Permissão de localização foi negada pelo usuário";
            status = "denied";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Localização não disponível no momento";
            status = "unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Tempo limite excedido para obter localização";
            status = "error";
            break;
          default:
            errorMessage = error.message || "Erro ao obter localização";
            status = "error";
            break;
        }
        setLocationState((prev) => ({
          ...prev,
          status,
          error: errorMessage,
        }));
        toast.error(errorMessage, {
          position: "top-center",
          autoClose: 3000,
          theme: "light",
          style: {
            background: "white",
            border: "2px solid transparent",
            borderRadius: "0.75rem",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }
        });
      },
      options
    );
  }, [isGeolocationSupported, profileData, setProfileData, onLocationUpdate]);

  const requestLocation = useCallback(async () => {
    if (!isGeolocationSupported) {
      toast.error("Seu dispositivo não suporta geolocalização", {
        position: "top-center",
        autoClose: 3000,
        theme: "light",
        style: {
          background: "white",
          border: "2px solid transparent",
          borderRadius: "0.75rem",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }
      });
      return;
    }

    toast.info("Solicitando permissão de localização...", {
      position: "top-center",
      autoClose: 3000,
      theme: "light",
      style: {
        background: "white",
        border: "2px solid transparent",
        borderRadius: "0.75rem",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      },
    });
    getCurrentLocation();
  }, [isGeolocationSupported, getCurrentLocation]);

  const clearLocation = useCallback(async () => {
    toast.info("Removendo localização...", {
      position: "top-center",
      autoClose: 3000,
      theme: "light",
      style: {
        background: "white",
        border: "2px solid transparent",
        borderRadius: "0.75rem",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      },
    });

    setLocationState({
      status: "idle",
      latitude: null,
      longitude: null,
      error: null,
      accuracy: null,
    });
    setProfileData({
      ...profileData,
      latitude: null,
      longitude: null,
    });
    onLocationUpdate(0, 0);
    toast.success("Localização removida com sucesso!", {
      position: "top-center",
      autoClose: 3000,
      theme: "light",
      style: {
        background: "white",
        border: "2px solid transparent",
        borderRadius: "0.75rem",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      }
    });
  }, [profileData, setProfileData, onLocationUpdate]);

  useEffect(() => {
    checkPermissionStatus();
  }, [checkPermissionStatus]);

  useEffect(() => {
    if (profileData.latitude !== undefined && profileData.longitude !== undefined) {
      setLocationState((prev) => ({
        ...prev,
        status: "granted",
        latitude: profileData.latitude ?? null,
        longitude: profileData.longitude ?? null,
      }));
    }
  }, [profileData.latitude, profileData.longitude]);

  const renderLocationStatus = () => {
    switch (locationState.status) {
      case "idle":
        return (
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertDescription>Adicione sua localização para encontrar pessoas próximas a você.</AlertDescription>
          </Alert>
        );
      case "requesting":
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Obtendo sua localização... Isso pode levar alguns segundos.</AlertDescription>
          </Alert>
        );
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
        );
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
        );
      case "unavailable":
        return (
          <Alert className="border-yellow-200 bg-yellow-50">
            <MapPin className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Geolocalização não está disponível neste dispositivo ou navegador.
            </AlertDescription>
          </Alert>
        );
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
        );
      default:
        return null;
    }
  };

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
  );
};

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
  profileData: ProfileData;
  setProfileData: (data: ProfileData) => void;
  errors: Errors;
  validateField: (field: keyof ProfileData, value: any) => void;
  saving: boolean;
  uploading: boolean;
  handleUpdateProfile: () => void;
  isNewProfile: boolean;
  photos: Photo[];
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  calculateAge: (birthDate: string) => number | null;
  onLocationUpdate: (lat: number, lng: number) => void;
}) => (
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
                onError={(e) => {
                  e.currentTarget.src = "/placeholder-image.png";
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
            <p className="mt-2 text-sm text-gray-500">Idade: {calculateAge(profileData.birth_date)} anos</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="birth_date">Data de Nascimento</Label>
          <Input
            id="birth_date"
            type="date"
            value={profileData.birth_date}
            onChange={(e) => {
              setProfileData({ ...profileData, birth_date: e.target.value });
              validateField("birth_date", e.target.value);
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
                  setProfileData({ ...profileData, name: e.target.value });
                  validateField("name", e.target.value);
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
                  setProfileData({ ...profileData, bio: e.target.value });
                  validateField("bio", e.target.value);
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  placeholder="Sua cidade"
                  value={profileData.city}
                  onChange={(e) => {
                    setProfileData({ ...profileData, city: e.target.value });
                    validateField("city", e.target.value);
                  }}
                  className={errors.city ? "border-red-500" : ""}
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
                    setProfileData({ ...profileData, profession: e.target.value });
                    validateField("profession", e.target.value);
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

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
              <IMaskInput
                mask="(00) 00000-0000"
                value={profileData.whatsapp || ""}
                onAccept={(value: string) => {
                  setProfileData({ ...profileData, whatsapp: value });
                 
                }}
                disabled={saving || uploading}
                id="whatsapp"
                placeholder="(XX) XXXXX-XXXX"
                className={`w-full p-2 border rounded-md ${errors.whatsapp ? "border-red-500" : "border-gray-300"}`}
                aria-describedby="whatsapp-error"
              />
              {errors.whatsapp && (
                <p id="whatsapp-error" className="text-sm text-red-500">
                  {errors.whatsapp}
                </p>
              )}
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
          className="w-full mt-4 bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white hover:opacity-90 rounded-full"
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
);

// Profile Photos Component
const ProfilePhotos = ({
  photos,
  uploading,
  saving,
  handleFileChange,
  handleDeletePhoto,
  handleSetPrimaryPhoto,
}: {
  photos: Photo[];
  uploading: boolean;
  saving: boolean;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDeletePhoto: (photoName: string) => void;
  handleSetPrimaryPhoto: (storagePath: string) => void;
}) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>Fotos do Perfil</CardTitle>
      <CardDescription>Adicione ou remova fotos do seu perfil (máximo 6)</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="mb-6">
        <label htmlFor="photo-upload-secondary" className="block">
          <Button
            asChild
            variant="outline"
            disabled={photos.length >= 6 || uploading || saving}
            className="w-full rounded-md"
            aria-label="Adicionar nova foto"
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
          photos.map((photo, index) => (
            <div key={photo.storage_path} className="relative group">
              <img
                src={photo.publicUrl || "/placeholder-image.png"}
                alt={`Foto ${index + 1}`}
                className={`w-full h-48 object-cover rounded-md ${photo.isPrimary ? "ring-2 ring-2 ring-oraculo-purple" : ""}`}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder-image.png";
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center gap-2">
                {!photo.isPrimary && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSetPrimaryPhoto(photo.storage_path)}
                    disabled={uploading || saving}
                    aria-label={`Definir foto ${index + 1} como principal`}
                  >
                    <Star className="h-4 w-4 mr-1" /> Principal
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeletePhoto(photo.name)}
                  disabled={uploading || saving}
                  aria-label={`Excluir foto ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {photo.isPrimary && (
                <div className="absolute top-2 left-2 bg-oraculo-purple text-white text-xs px-2 py-1 rounded">
                  Principal
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-12 border border-dashed rounded-md">
            <p>Sem fotos. Adicione sua primeira foto!</p>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

// Profile Preferences Component
const ProfilePreferences = ({
  preferences,
  setPreferences,
  saving,
  uploading,
  handleUpdateProfile,
}: {
  preferences: Preferences;
  setPreferences: (prefs: Preferences) => void;
  saving: boolean;
  uploading: boolean;
  handleUpdateProfile: () => void;
}) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>Preferências</CardTitle>
      <CardDescription>Ajuste as preferências de descoberta e privacidade do seu perfil</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label >Gênero de Interesse</Label>
          <Select
            value={preferences.genderPreference}
            onChange={(value: GenderPreference) => setPreferences({ ...preferences, genderPreference: value })}
            disabled={saving || uploading}
          >
            <SelectTrigger id="genderPreference">
              <SelectValue placeholder="Selecionar gênero de interesse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HOMEM">Masculino</SelectItem>
              <SelectItem value="MULHER">Feminino</SelectItem>
              <SelectItem value="TODOS">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <Label>Faixa Etária de Idade</Label>
          <div className="flex gap-4">
            <Slider
              min={18}
              max={preferences.maxAge}
              step={1}
              value={[preferences.minAge]}
              onChange={(value: number[]) => setPreferences({ ...preferences, minAge: value[0] })}
              disabled={saving || uploading}
              aria-label="Idade mínima"
            />
            <Slider
              min={preferences.minAge}
              max={99}
              step={1}
              value={[preferences.maxAge]}
              onChange={(value: number[]) => setPreferences({ ...preferences, maxAge: value[0] })}
              disabled={saving || uploading}
              aria-label="Idade máxima"
            />
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>{preferences.minAge} anos</span>
            <span>{preferences.maxAge} anos</span>
          </div>
        </div>

        <div className="space-y-4">
          <Label>Distância Máxima</Label>
          <Slider
            min={1}
            max={100}
            step={1}
            value={[preferences.maxDistance]}
            onChange={(value: number[]) => {
              setPreferences((prev) => ({ ...prev, maxDistance: value[0] }));
            }}
            disabled={saving || maxDistance}
            aria-label="Distância máxima"
          />
          <p className="text-sm text-gray-500">{preferences.maxDistance} km</p>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-200">
            <h3 className="text-lg font-medium">Configurações de Privacidade</h3>
            <div className="flex items-center justify-between">
              <div>
                <Label for="showProfile">Mostrar meu perfil</Label>
                <p className="text-sm text-gray-500">Quando desativado, seu perfil não será visível para outros usuários.</p>
              </div>
              <Switch
                id="showProfile"
                checked={preferences.showProfile}
                onChange={(checked) => setPreferences({ ...preferences, showProfile: checked })}
                disabled={saving || uploading}
                aria-label="showProfile"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label for="matchNotifications">Notificações de Match</Label>
                <p className="text-sm text-gray-500">Receba alertas sobre novos matches.</p>
              </div>
              <Switch
                id="matchNotifications"
                checked={preferences.matchNotifications}
                onChange={(checked) => setPreferences({ ...preferences, matchNotifications })}
                disabled={saving || uploading}
                aria-label="matchNotifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label for="messageNotifications">Notificações de Mensagens</Label>
                <p className="text-sm text-gray-500">Receba alertas sobre novas mensagens.</p>
              </div>
              <Switch
                id="messageNotifications"
                checked={preferences.messageNotifications}
                onChange={(checked) => setPreferences({ ...preferences, messageNotifications })}
                disabled={saving || uploading}
                aria-label="messageNotifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label for="showWhatsApp">Exibir WhatsApp para matches</Label>
                <p className="text-sm"> text-gray-500">Quando ativado, seu número será visível para seus matches.</p>
              </div>
              <Switch
                id="showWhatsApp"
                checked={preferences.showWhatsApp}
                onChange={(checked) => {
                  setPreferences((prev) => ({ ...prev, showWhatsApp: checked })}
                disabled={saving || uploading}
                aria-label="showWhatsApp"
              />
            </div>
          </div>

          <Button
            onClick={handleUpdateProfile}
            disabled={saving || uploading}
            className="w-full bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white rounded-full"
            aria-label="Salvar preferências"
          >
            {saving ? (
              <>
                <Loader2 className="mr-4 w-2" h-2 animate-spin" aria-hidden="true" />
                Salvando..."
              </>
              )}
            : "Salvar Preferências"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

export default ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"info" | "fotos" | "preferencias">("info");
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
    whatsapp: null,
  });
  const [preferences, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isNewProfileState, setIsNewProfile] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [user, setUser] = useState<any>(null);
  const [preferences, setPreferences] = useState<Preferences>({
    genderPreference: "TODOS",
    minAge: 18",
    maxAge: 50,
    maxDistance: 50,
    showProfile: true,
    matchNotifications: true,
    messageNotifications: true,
    showWhatsApp: false,
  });

  const showAlert = useCallback(
    async (type: "success" | "error", title: string, content: string) => {
      toast[type](`${title}: ${content}`, {
        position: "top-center",
        autoClose: 3000,
        theme: "light",
        style: {
          background: "white",
          border: "0.2px solid transparent",
          borderRadius: "0.75rem",
          box-shadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        },
        progressStyle: {
          background: "linear-gradient(to right, #7B3FE4, #3B82F6)",
        },
      });
    },
    []
  );

  const registerPushSubscription = useCallback(
    async () => {
      try {
        if (!("service" in navigator && "PushManager" in window)) {
          console.log("Push notifications not supported");
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.log("Notification permission denied");
          showAlert("error", "Erro", "Permissão de notificações negada.");
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        });

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (!userData.user || userError) {
          throw new Error("No user not logged in");
        }

        const { error: subscriptionError } = await supabase
          .from("push_subscriptions")
          .upsert({
            user_id: userData.user.id,
            subscription: subscription.toJSON(),
          });

        if (subscriptionError) {
          throw subscriptionError;
        }

        showAlert("success", "Sucesso", "Notificações ativadas com sucesso!");
        console.log("Push subscription registered");
      } catch (error: any) {
        console.error("Push subscription error:", error.message);
        showAlert("error", "Erro", "Não foi possível ativar notificações: " + error.message);
      }
    }, [showAlert]);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);
          return registerPushSubscription();
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
          showAlert("error", "Erro", "Falha ao registrar o service worker.");
        });
    }
  }, [registerPushSubscription, showAlert]);

  const handleLocationUpdate = useCallback(
    async (latitude: number, longitude: number) => {
      if (!user || !profileId) {
        return;
      }
      try {
        const updateData = latitude === 0 && longitude === 0 ? { latitude: null, longitude: null } : { latitude, longitude };
        const { error } = await supabase.from("profiles").update(updateData).eq("id", profileId);
        if (error) {
          throw error;
        }
      } catch (error: any) {
        showAlert("error", "Erro", "Não foi possível salvar sua localização.");
      }
    },
    [user, profileId, showAlert]
  );

  const calculateAge = useCallback((birthDate: string): number | null => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    if (isNaN(birth.getTime()) || birth > today) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 18 ? age : null;
  }, []);

  const validateField = useCallback(
    (field: keyof ProfileData, value: any) => {
      const newErrors = { ...errors };
      switch (field) {
        case "name":
          if (!value.trim()) {
            newErrors.name = "O nome é obrigatório.";
          } else if (value.length < 2) {
            newErrors.name = "O nome deve ter pelo menos 2 caracteres.";
          } else {
            delete newErrors.name;
          }
          break;
        case "birth_date":
          if (!value) {
            newErrors.birth_date = "A data de nascimento é obrigatória.";
          } else {
            const birthDate = new Date(value);
            const today = new Date();
            if (isNaN(birthDate.getTime()) || birthDate > today) {
              newErrors.birth_date = "Data de nascimento inválida.";
            } else {
              const age = calculateAge(value);
              if (age === null || age < 18) {
                newErrors.birth_date = "Você deve ter pelo menos 18 anos.";
              } else {
                delete newErrors.birth_date;
              }
            }
          }
          break;
        case "bio":
          if (value.length > 500) {
            newErrors.bio = "A biografia deve ter no máximo 500 caracteres.";
          } else {
            delete newErrors.bio;
          }
          break;
        case "city":
          if (!value.trim()) {
            newErrors.city = "A cidade é obrigatória.";
          } else {
            delete newErrors.city;
          }
          break;
        case "profession":
          if (!value.trim()) {
            newErrors.profession = "A profissão é obrigatória.";
          } else {
            delete newErrors.profession;
          }
          break;
        case "whatsapp":
          if (value && !/^\(\d{2}\)\s\d{5}-\d{4}$/.test(value)) {
            newErrors.whatsapp = "Formato inválido. Use (XX) XXXXX-XXXX.";
          } else {
            delete newErrors.whatsapp;
          }
          break;
      }
      setErrors(newErrors);
    },
    [errors, calculateAge]
  );

  const validateProfileData = useCallback((): boolean => {
    const newErrors: Errors = {};
    if (!profileData.birth_date) {
      newErrors.birth_date = "A data de nascimento é obrigatória.";
    } else {
      const age = calculateAge(profileData.birth_date);
      if (age === null || age < 18) {
        newErrors.birth_date = "Você deve ter pelo menos 18 anos.";
      }
    }
    if (isNewProfile && photos.length === 0) {
      newErrors.photos = "Por favor, adicione pelo menos uma foto ao seu perfil.";
    }
    if (!isNewProfile || (photos.length > 0 && profileData.birth_date && !newErrors.birth_date)) {
      if (!profileData.name.trim()) newErrors.name = "O nome é obrigatório.";
      if (!profileData.city.trim()) newErrors.city = "A cidade é obrigatória.";
      if (!profileData.profession.trim()) newErrors.profession = "A profissão é obrigatória.";
      if (profileData.bio.length > 500) newErrors.bio = "A biografia deve ter no máximo 500 caracteres.";
      if (profileData.whatsapp && !/^\(\d{2}\)\s\d{5}-\d{4}$/.test(profileData.whatsapp)) {
        newErrors.whatsapp = "Formato inválido. Use (XX) XXXXX-XXXX.";
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      showAlert("error", "Erro", "Por favor, corrija os erros nos campos antes de salvar.");
      return false;
    }
    return true;
  }, [profileData, photos, isNewProfile, showAlert, calculateAge]);

  const loadPhotos = useCallback(async () => {
    if (!user || !profileId) {
      setPhotos([]);
      return;
    }
    try {
      const { data: photosData, error } = await supabase
        .from("profile_photos")
        .select("storage_path, is_primary")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const photoUrls = await Promise.all(
        photosData.map(async (photo: any) => {
          const { data: publicUrlData } = supabase.storage.from("profiles").getPublicUrl(photo.storage_path);
          return {
            name: photo.storage_path.split("/").pop()!,
            storage_path: photo.storage_path,
            publicUrl: publicUrlData.publicUrl,
            isPrimary: photo.is_primary,
          };
        })
      );
      setPhotos(photoUrls);
    } catch (error: any) {
      console.error("Error loading photos:", error);
      showAlert("error", "Erro", "Não foi possível carregar as fotos.");
      setPhotos([]);
    }
  }, [user, profileId, showAlert]);

  const compressImage = async (file: File): Promise<File> => {
    const image = await createImageBitmap(file);
    const canvas = document = createElement("canvas");
    const maxSize = 800;
    let width = image.width;
    let height = image.height;
    if (width > height) {
      if (width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      }
    } else {
      if (height > maxSize) {
        width = Math.round((width * maxSize) / / height);
        height = maxSize;
      }
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(image, 0, 0, width, height);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: file.type }));
          } else {
            reject(new Error("Falha ao compress imagem"));
          }
        },
        file.type,
        0.8
      );
    });
  };

  const handlePhotoUpload = useCallback(
    async (filePath: File, uploadId: string) => {
      if (!user || !filePath) {
        showAlert("error", "Erro", "Usuário ou arquivo inválido.");
        return;
      }
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      const maxSize = 5; * *1024*1024; // MB
      if (!validTypes.includes(filePath.type)) {
        showAlert("error", "Erro", "Formato de imagem inválido. Use JPEG, PNG ou WebPWebP.");
        return;
      }
      if (filePath.size > maxSize || filePath.size === 0) {
        showAlert("error", "Erro", filePath.size > maxSize ? "Imagem muito grande." : "Arquivo inválido.");
        return;
      }

      setUploading(true);
      try {
        const compressedFile = await compressImage(filePath);
        const fileExt = compressedFilePath.name.split(".").pop();
        const fileName = `${Date.now()}_${uploadId}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("profiles")
          .upload(filePath, compressedFile);
        if (uploadError) {
          throw errorUploadError;
        }

        let profileIdToUse = profileId;
        if (!profileIdToUse) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();
          if (profileError && profileError.error.code !== "PGRST116") {
            throw profileError;
          }
          if (!profileData) {
            const username = await generateUsername(profileData.name || "user");
            const { data: newProfile, error: insertError } = await supabase
              .from("profiles")
              .insert({
                user_id: user.id,
                username,
                created_at: new Date().toISOString(),
              })
              .select("id")
              .single();
            if (insertError) {
              throw errorInsertError;
            }
            profileIdToUse = newProfile.id;
            setProfileId(profileIdToUse);
            setIsNewProfile(false);
          } else {
            profileIdToUse = profileData.id;
            setProfileId(profileIdToUse);
          }
        }

        const isFirstPhoto = photos.length === 0;
        const { error: insertError } = profileIdToUse
        await supabase.from("profile_photos").insert({
          profile_id: profileIdToUse,
          storage_path: filePath,
          is_primary: isFirstPhoto,
        });
        if (insertError) {
          await supabase.storage
            .from("profiles")
            .remove([filePath]);
          throw errorInsertError;
        }

        const { data: publicUrl } = supabase.storage.from("profiles").getPublicUrl(filePath);
        if (isFirstPhoto) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ avatar_url: publicUrl.publicUrl })
            .eq("id", profileIdToUse);
          if (errorUpdateError) {
            throw updateError;
          }
        }

        showAlert("success", "Sucesso", "Foto enviada com sucesso!");
        loadPhotos();
      } catch (error: any) {
        console.error("Upload error:", error);
        showAlert("error", "Erro", "Não foi possível enviar a foto.");
      } finally {
        setUploading(false);
      }
    },
    [user, photos, profileId, showAlert, loadPhotos]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        showAlert("error", "Erro", "Nenhum arquivo selecionado."));
        return;
      }
      const uploadId = uuidv4();
      handlePhotoUpload(file, uploadId);
      event.target.value = "";
    },
    [handlePhotoUpload, showAlert]
  );

  const handleDeletePhoto = useCallback(
    async (photoName: string) => {
      if (!user || !profileId) {
        showAlert("error", "Erro", "Usuário ou perfil não encontrado.");
        return;
      }
      try {
        const filePath = `${user.id}/${photoName}`;
        const { error: deleteError } = await supabase.storage
          .from("profiles")
          .delete([filePath])
          .from("profile_photos")
          .delete()
          .eq("file_path", storagePath)
          .eq("profile_id", profileId);
        if (errorDeleteError) {
          throw deleteError;
        }

        const { error: updateError } = profileId
            await supabase
              .from("profile_photos")
              .update({ isPrimary: true })
              .eq("profile_id", profileId)
              .order("id", { ascending: true })
              .limit(1);
            if (updateError) {
              throw updateError;
            }

        showAlert("success", "Sucesso", "Foto removida com sucesso!");
          loadPhotos();
        } catch (error: any) {
          showAlert("error", "Erro", "Não foi possível remover a foto.");
        }
      }, [user, profileId, showAlert, photos]
    );

    const handleSetProfilePhoto = useCallback(
      async (storagePath: string) => {
        if (!user || !profileId) {
          showAlert("error", "Erro", "Usuário ou perfil não encontrado.");
          return;
        }
        try {
          await supabase
            .from("profile_photos")
            .update({ isPrimary: false })
            .eq("profile_id", profileId);
            const { error: updateError } = await supabase
              .from("profile_photos")
              .update({ isPrimary: true })
              .eq("storagePath", storagePath)
              .eq("profile_id", profileId);
            if (errorUpdateError) {
              throw updateError;
            }
            const { data: publicUrl } = supabase.storage.from("profiles").getPublicUrl(storagePath);
            const { error: avatarError } = await supabase
              .from("profiles")
              .update({ avatarUrl: publicUrl.publicUrl })
              .eq("id", profileId);
            if (avatarError) {
              throw errorAvatarError;
            showAlert("success", "Sucesso", "Foto principal definida!");
            loadPhotos();
          } catch (error: any) {
            showAlert("error", "Erro", "Não foi possível definir a foto principal.");
          }
        }, [user, profileId, showAlert, loadPhotos]
      );

      const generateUsername = useCallback(
        async (name: string) => {
          const baseUsername = "@" + name.toLowerCase().replace(/\s+/g, "");
          let username = baseUsername;
          let counter = 1;
          while (true) {
            const { data, error } = await supabase.from("profiles").select("username").eq("username", username).single();
            if (error || !data) break;
            username = `${baseUsername}${counter}`;
            counter++;
          }
          return username;
        }, []
      );

      const handleUpdateProfile = useCallback(
        async () => {
          if (!user || !validateProfileData()) {
            showAlert("error", "Erro", "Por favor, corrija os erros antes de salvar.");
            return;
          }
          setSaving(true);
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
              whatsapp: profileData.whatsapp,
              gender_preference: preferences.genderPreference,
              min_age: preferences.minAge,
              max_age: preferences.maxAge,
              max_distance: preferences.maxDistance,
              show_profile: preferences.showProfile,
              match_notifications: preferences.matchNotifications,
              message_notifications: preferences.messageNotifications,
              show_whatsapp: preferences.showWhatsApp,
              updated_at: new Date().toISOString(),
              avatar_url: photos.find((photo) => photo.isPrimary)?.publicUrl || photos[0]?.publicUrl || null,
            };

            if (profileId) {
              const { error: updateError } = await supabase
                .from("profiles")
                .update({ ...profilePayload, username: await generateUsername(profileData.name) })
                .eq("id", profileId);
              if (updateError) {
                throw updateError;
              }
            } else {
              const username = await generateUsername(profileData.name);
              const { data: newProfile, error: insertError } = await supabase
                .from("profiles")
                .insert({
                  ...profilePayload,
                  user_id: user.id,
                  username,
                  created_at: new Date().toISOString(),
                })
                .select("id")
                .single();
              if (errorInsertError) {
                throw insertError;
              }
              setProfileId(newProfile.id);
              setIsNewProfile(false);
            }

            // Trigger notification
            await supabase
              .from("notifications")
              .insert({
                user_id: user.id,
                message: "Seu perfil foi atualizado com sucesso!",
              });

            showAlert("success", "Sucesso", profileId ? "Perfil atualizado!" : "Perfil criado!");
            if (!profileId) {
              router.push("/dashboard");
            }
          } catch (error: any) {
            console.error("Profile update error:", error);
            showAlert("error", "Erro", "Não foi possível salvar o perfil.");
          } finally {
            setSaving(false);
          }
        }, [
          user,
          profileId,
          profileData,
          preferences,
          validateFieldData,
          photos,
          generateUsername,
          showAlert,
          routerPush
        ]
      );

      useEffect(() => {
        const fetchUser = async () => {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) {
            setUser(userData.user);
          } else {
            router.push("/login");
          }
        };
        fetchUser();
      }, [router]);

      useEffect(() => {
        if (!user) return;
        const fetchProfileId = async () => {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();
          if (error || profileError.code !== "PGRST116") {
            throw profileError;
          }
          setProfileId(profileData?.id || null);
          setIsNewProfile(!profileData);
        };
        try {
          fetchProfileId();
        } catch (error: any) {
          showAlert("error", "Erro", "Não foi possível carregar o perfil.");
        }
      }, [user, showAlert]);

      useEffect(() => {
        if (!user || !profileId) return;
        const fetchProfile = async () => {
          try {
            const { data: profile, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", profileId)
              .single();
            if (error) throw error;
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
              whatsapp: profile.whatsapp || null,
            });
            setPreferences({
              genderPreference: profile.gender_preference || "TODOS",
              minAge: profile.min_age || 18,
              maxAge: profile.max_age || 50,
              maxDistance: profile.max_distance || 50,
              showProfile: profile.showProfile || true,
              matchNotifications: profile.match_notifications || true,
              messageNotifications: profile.message_notifications || true,
              showWhatsApp: profile.showWhatsApp || false,
            });
            setIsNewProfile(false);
            loadPhotos();
          } catch (error: any) {
            showAlert("error", "Erro", "Não foi possível carregar o perfil.");
          }
        };
        fetchProfile();
      }, [user, profileId, showAlert, loadPhotos]);

      if (!user) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin" aria-label="Carregando" />
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-gray-100 px-4 py-6">
          <ToastContainer />
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-transparent bg-clip-text mb-6">
              Meu Perfil
            </h2>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="fotos">Fotos</TabsTrigger>
                <TabsTrigger value="preferencias">Preferências</TabsTrigger>
              </TabsList>
              <TabsContent value="info">
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
                <NotificationCenter />
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
                  handleUpdateProfile={handleUpdateProfile}
                />
              </TabsContent>
            </Tabs>
            <Button
              onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
              variant="outline"
              className="w-full mt-6"
            >
              Sair
            </Button>
          </div>
        </div>
      );
    }
