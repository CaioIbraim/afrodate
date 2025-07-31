"use client";

import type React from "react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { Loader2, Star, Trash2, Upload, MapPin, Navigation, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { v4 as uuidv4 } from "uuid";
import { ProfileHeader } from "@/components/profile-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDebounce } from "use-debounce";
import { Suspense } from "react";

// Importa os componentes de Tooltip do shadcn/ui, necessários para LocationCapture
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- Tipos ---
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
  whatsapp_number?: string;
  share_whatsapp?: boolean;
};
type Preferences = {
  genderPreference: GenderPreference;
  minAge: number;
  maxAge: number;
  maxDistance: number;
  showProfile: boolean;
  matchNotifications: boolean;
  messageNotifications: boolean;
};
type Errors = Record<string, string>;
type LocationState = {
  status: "idle" | "requesting" | "granted" | "denied" | "unavailable" | "error";
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  accuracy: number | null;
};
// Tipo para interesses do DB (tabela 'interests')
interface DBInterest {
  id: number;
  name: string;
  storage_path: string | null;
  type: string;
}

// --- Cálculo do Signo do Zodíaco ---
const getZodiacSign = (birthDate: string): { sign: string; emoji: string } => {
  if (!birthDate) return { sign: "Desconhecido", emoji: "" };
  const date = new Date(birthDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
    return { sign: "Áries", emoji: "♈" };
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
    return { sign: "Touro", emoji: "♉" };
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
    return { sign: "Gêmeos", emoji: "♊" };
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
    return { sign: "Câncer", emoji: "♋" };
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22))
    return { sign: "Leão", emoji: "♌" };
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
    return { sign: "Virgem", emoji: "♍" };
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
    return { sign: "Libra", emoji: "♎" };
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
    return { sign: "Escorpião", emoji: "♏" };
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
    return { sign: "Sagitário", emoji: "♐" };
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
    return { sign: "Capricórnio", emoji: "♑" };
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
    return { sign: "Aquário", emoji: "♒" };
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20))
    return { sign: "Peixes", emoji: "♓" };
  return { sign: "Desconhecido", emoji: "" };
};

// --- Cálculo de Conclusão do Perfil ---
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
  ];
  let filledFields = 0;
  requiredFields.forEach((field) => {
    if (field in profileData) {
      const value = profileData[field as keyof ProfileData];
      if (field === "interests") {
        if (Array.isArray(value) && value.length > 0) filledFields++;
      } else if (typeof value === "string" && value.trim() !== "") {
        filledFields++;
      } else if (typeof value === "boolean") {
        filledFields++;
      }
    } else if (field in preferences) {
      const value = preferences[field as keyof Preferences];
      if (value !== null && value !== undefined) filledFields++;
    }
  });
  if (photos.length > 0) filledFields++;
  const totalFields = requiredFields.length + 1; // +1 para fotos
  return Math.round((filledFields / totalFields) * 100);
};

// --- Componente LocationCapture (Melhorado com UI minimalista) ---
const LocationCapture = ({
  profileData,
  setProfileData,
  saving,
  uploading,
  onLocationUpdate,
}: {
  profileData: { latitude?: number | null; longitude?: number | null };
  setProfileData: (data: { latitude?: number | null; longitude?: number | null }) => void;
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

  const MySwal = useMemo(() => withReactContent(Swal), []);
  const isGeolocationSupported = useMemo(() => "geolocation" in navigator, []);
  const lastLocationAlertTimestamp = useRef(0);
  const DEBOUNCE_ALERT_TIME = 5000; // 5 segundos de debounce para o alerta de sucesso da localização

  const getCurrentLocation = useCallback(
    (showSuccessAlert: boolean = true) => {
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
          setProfileData({ latitude, longitude });
          onLocationUpdate(latitude, longitude);

          if (showSuccessAlert && Date.now() - lastLocationAlertTimestamp.current > DEBOUNCE_ALERT_TIME) {
            MySwal.fire({
              icon: "success",
              title: "Localização Capturada!",
              text: `Coordenadas obtidas com precisão de ${Math.round(accuracy || 0)}m`,
              timer: 3000,
              showConfirmButton: false,
              customClass: {
                popup: "border-2 border-transparent bg-white rounded-xl",
                title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-xl font-bold",
              },
            });
            lastLocationAlertTimestamp.current = Date.now();
          }
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
          setLocationState((prev) => ({ ...prev, status, error: errorMessage }));
          MySwal.fire({
            icon: "error",
            title: "Erro de Localização",
            text: errorMessage,
            customClass: {
              popup: "border-2 border-transparent bg-white rounded-xl",
              title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-xl font-bold",
              confirmButton: "bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-white px-4 py-2 rounded shadow",
            },
          });
        },
        options
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setProfileData]
  );

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
          getCurrentLocation(false); // Não mostrar alerta ao verificar permissão
        } else if (permission.state === "denied") {
          setLocationState((prev) => ({
            ...prev,
            status: "denied",
            error: "Permissão de localização foi negada",
          }));
        } else {
          setLocationState((prev) => ({ ...prev, status: "idle" }));
        }
      }
    } catch (error) {
      console.error("[checkPermissionStatus] Error:", error);
      setLocationState((prev) => ({
        ...prev,
        status: "error",
        error: "Erro ao verificar permissões de localização",
      }));
    }
  }, [isGeolocationSupported, getCurrentLocation]);

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
      });
      return;
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
    });
    if (result.isConfirmed) {
      getCurrentLocation(true); // Mostrar alerta ao solicitar localização manualmente
    }
  }, [isGeolocationSupported, getCurrentLocation, MySwal]);

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
    });
    if (result.isConfirmed) {
      setLocationState({
        status: "idle",
        latitude: null,
        longitude: null,
        error: null,
        accuracy: null,
      });
      setProfileData({ latitude: null, longitude: null });
      onLocationUpdate(0, 0);
    }
  }, [setProfileData, onLocationUpdate, MySwal]);

  useEffect(() => {
    checkPermissionStatus();
  }, [checkPermissionStatus]);

  useEffect(() => {
    // Atualiza o estado interno se a localização no profileData mudar externamente
    if (
      (profileData.latitude !== undefined && profileData.longitude !== undefined) &&
      (profileData.latitude !== locationState.latitude || profileData.longitude !== locationState.longitude)
    ) {
      setLocationState((prev) => ({
        ...prev,
        status: "granted",
        latitude: profileData.latitude ?? null,
        longitude: profileData.longitude ?? null,
      }));
    }
  }, [profileData.latitude, profileData.longitude, locationState.latitude, locationState.longitude]);

  const renderLocationIcon = () => {
    switch (locationState.status) {
      case "granted":
        return <MapPin className="h-5 w-5 text-green-500" />;
      case "requesting":
        return <Loader2 className="h-5 w-5 animate-spin text-gray-500" />;
      case "denied":
        return <MapPin className="h-5 w-5 text-red-500" />;
      case "unavailable":
        return <MapPin className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <MapPin className="h-5 w-5 text-red-500" />;
      default:
        return <MapPin className="h-5 w-5 text-gray-500" />;
    }
  };

  const renderTooltipContent = () => {
    switch (locationState.status) {
      case "granted":
        return "Localização capturada";
      case "requesting":
        return "Obtendo localização...";
      case "denied":
        return "Permissão de localização negada";
      case "unavailable":
        return "Geolocalização não disponível";
      case "error":
        return locationState.error || "Erro ao obter localização";
      default:
        return "Capturar localização";
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-base font-medium block" htmlFor="location-action">
          Localização
        </Label>
        <p className="text-sm text-gray-600">Compartilhe sua localização para encontrar pessoas próximas</p>
      </div>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                id="location-action"
                onClick={requestLocation}
                disabled={saving || uploading}
                className="rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-oraculo-cyan"
              >
                {renderLocationIcon()}
              </button>
            </TooltipTrigger>
            <TooltipContent>{renderTooltipContent()}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {locationState.status === "granted" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => getCurrentLocation(true)}
                  disabled={saving || uploading}
                  className="rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-oraculo-cyan"
                  aria-label="Atualizar localização"
                >
                  <Navigation className="h-5 w-5 text-green-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Atualizar localização</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {(locationState.status === "granted" || (profileData.latitude !== null && profileData.longitude !== null)) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={clearLocation}
                  disabled={saving || uploading}
                  className="rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label="Remover localização"
                >
                  <MapPin className="h-5 w-5 text-red-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Remover localização</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {/* Mensagens de erro/status ainda podem ser úteis abaixo dos ícones para clareza */}
      {locationState.status === "denied" && (
        <p className="text-sm text-red-500">Permissão de localização negada. Ative nas configurações do navegador.</p>
      )}
      {locationState.status === "unavailable" && (
        <p className="text-sm text-yellow-500">Geolocalização não disponível neste dispositivo.</p>
      )}
      {locationState.status === "error" && (
        <p className="text-sm text-red-500">{locationState.error}</p>
      )}
    </div>
  );
};


// --- Componente ProfileInfo ---
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
}) => {
  const zodiac = getZodiacSign(profileData.birth_date);
  
  // FIX: Create a wrapper function to satisfy the LocationCapture's prop type
  const setLocationData = useCallback(
    (data: { latitude?: number | null; longitude?: number | null }) => {
      setProfileData({ ...profileData, ...data });
    },
    [profileData, setProfileData]
  );
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{isNewProfile ? "Criar Perfil" : "Editar Informações"}</CardTitle>
        <CardDescription>
          Preencha seus dados pessoais e adicione sua foto principal
        </CardDescription>
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
                    e.currentTarget.src = "/placeholder-image.png";
                  }}
                />
                <AvatarFallback className="text-2xl">
                  {profileData.name ? profileData.name.charAt(0) : "?"}
                </AvatarFallback>
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
                <Progress
                  value={uploading ? 50 : 0}
                  className="w-full"
                  aria-label="Progresso do upload"
                />
                <p className="text-sm text-gray-500 mt-1 text-center">Enviando...</p>
              </div>
            )}
            {errors.photos && (
              <p id="photo-upload-error" className="mt-2 text-sm text-red-500 text-center">
                {errors.photos}
              </p>
            )}
            {calculateAge(profileData.birth_date) !== null && (
              <p className="mt-2 text-sm text-gray-500">
                Idade: {calculateAge(profileData.birth_date)} anos{" "}
                {zodiac.sign !== "Desconhecido" && (
                  <span>
                    ({zodiac.emoji} {zodiac.sign})
                  </span>
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
          {(photos.length > 0 || !isNewProfile) &&
            profileData.birth_date &&
            !errors.birth_date && (
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
                    onValueChange={(value: Gender) =>
                      setProfileData({ ...profileData, gender: value })
                    }
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
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_number">WhatsApp</Label>
                  <Input
                    id="whatsapp_number"
                    type="text"
                    placeholder="(31) 91234-5678"
                    value={profileData.whatsapp_number || ""}
                    onChange={(e) => {
                      setProfileData({ ...profileData, whatsapp_number: e.target.value });
                      validateField("whatsapp_number", e.target.value);
                    }}
                    disabled={saving || uploading}
                    maxLength={20}
                  />
                  {errors.whatsapp_number && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.whatsapp_number}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="share_whatsapp"
                    checked={!!profileData.share_whatsapp}
                    onCheckedChange={(checked) =>
                      setProfileData({ ...profileData, share_whatsapp: checked })
                    }
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
                        setProfileData({ ...profileData, city: e.target.value });
                        validateField("city", e.target.value);
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
                <LocationCapture
                  profileData={profileData}
                  setProfileData={setLocationData} // FIX APPLIED HERE
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
  );
};

// --- Componente ProfilePhotos ---
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
      <CardDescription>
        Adicione ou remova suas fotos do seu perfil (máximo 6)
      </CardDescription>
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
            <Progress
              value={50}
              className="w-full"
              aria-label="Progresso do upload"
            />
            <p className="text-sm text-gray-500 mt-1">Enviando...</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.length === 0 ? (
          <div className="col-span-3 text-center py-12 border border-dashed rounded-md">
            <p className="text-gray-600">Sem fotos. Adicione sua primeira foto!</p>
          </div>
        ) : (
          photos.map((photo, index) => (
            <div key={photo.storage_path} className="relative group">
              <img
                src={photo.publicUrl || "/placeholder-image.png"}
                alt={`Foto ${index + 1}`}
                className={`w-full h-48 object-cover rounded-md ${
                  photo.isPrimary ? "ring-2 ring-[#1E1E1E]" : ""
                }`}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder-image.png";
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
);

// --- Componente ProfilePreferences ---
const ProfilePreferences = ({
  preferences,
  setPreferences,
  saving,
  uploading,
}: {
  preferences: Preferences;
  setPreferences: (prefs: Preferences) => void;
  saving: boolean;
  uploading: boolean;
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
            onValueChange={(value: GenderPreference) =>
              setPreferences({ ...preferences, genderPreference: value })
            }
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
              onValueChange={(value: number[]) =>
                setPreferences({ ...preferences, minAge: value[0] })
              }
              disabled={saving || uploading}
              aria-label="Idade mínima"
            />
            <Slider
              min={preferences.minAge}
              max={99}
              step={1}
              value={[preferences.maxAge]}
              onValueChange={(value: number[]) =>
                setPreferences({ ...preferences, maxAge: value[0] })
              }
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
            onValueChange={(value: number[]) =>
              setPreferences({ ...preferences, maxDistance: value[0] })
            }
            disabled={saving || uploading}
            aria-label="Distância máxima"
          />
          <div className="flex justify-end text-sm text-gray-500">
            <span>{preferences.maxDistance} km</span>
          </div>
        </div>
        <div className="space-y-4 pt-2 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-700">
            Configurações de Privacidade
          </h3>
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
              onCheckedChange={(checked: boolean) =>
                setPreferences({ ...preferences, showProfile: checked })
              }
              disabled={saving || uploading}
              aria-label="Toggle mostrar perfil"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="matchNotifications" className="text-base">
                Notificações de Match
              </Label>
              <p className="text-sm text-gray-500">
                Receber notificações quando houver um novo match
              </p>
            </div>
            <Switch
              id="matchNotifications"
              checked={preferences.matchNotifications}
              onCheckedChange={(checked: boolean) =>
                setPreferences({ ...preferences, matchNotifications: checked })
              }
              disabled={saving || uploading}
              aria-label="Toggle notificações de match"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="messageNotifications" className="text-base">
                Notificações de Mensagens
              </Label>
              <p className="text-sm text-gray-500">
                Receber notificações quando receber mensagens novas
              </p>
            </div>
            <Switch
              id="messageNotifications"
              checked={preferences.messageNotifications}
              onCheckedChange={(checked: boolean) =>
                setPreferences({ ...preferences, messageNotifications: checked })
              }
              disabled={saving || uploading}
              aria-label="Toggle notificações de mensagens"
            />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// --- Componente ProfileInterests ---
const ProfileInterests = ({ interests }: { interests: string[] }) => {
  const router = useRouter(); // Import useRouter here

  const handleEditInterests = () => {
    router.push("/interests"); // Redirect para a página de seleção de interesses
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Meus Interesses</CardTitle>
        <CardDescription>Interesses que você selecionou</CardDescription>
      </CardHeader>
      <CardContent>
        {interests.length === 0 ? (
          <p className="text-gray-600 text-center">Nenhum interesse cadastrado. Adicione seus interesses!</p>
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
        <Button
          onClick={handleEditInterests}
          className="w-full mt-6 bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-white hover:opacity-90 focus:ring-2 focus:ring-[#1E1E1E]"
        >
          Editar Interesses
        </Button>
      </CardContent>
    </Card>
  );
};

const MySwal = withReactContent(Swal);

// --- Componente ProfilePage ---
export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, isLoading } = useUser();
  const [activeTab, setActiveTab] = useState<
    "informacoes" | "fotos" | "preferencias" | "interesses"
  >("informacoes");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isNewProfile, setIsNewProfile] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
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
  });
  const [preferences, setPreferences] = useState<Preferences>({
    genderPreference: "TODOS",
    minAge: 18,
    maxAge: 50,
    maxDistance: 50,
    showProfile: true,
    matchNotifications: true,
    messageNotifications: true,
  });
  const [debouncedPreferences] = useDebounce(preferences, 1000);

  const showAlert = useCallback(
    async (type: "success" | "error", title: string, text: string) => {
      return MySwal.fire({
        icon: type,
        title,
        text,
        customClass: {
          popup: "border-2 border-transparent bg-white rounded-xl",
          title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
          confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
        },
        willOpen: (popup) => {
          popup.setAttribute("aria-live", "assertive");
        },
      });
    },
    [MySwal]
  );

  // Auto-save preferences
  useEffect(() => {
    if (!profileId || isNewProfile) return;
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
          .eq("id", profileId);
        if (error) throw error;
      } catch (err) {
        console.error("[savePreferences] Error:", (err as Error).message);
        showAlert("error", "Erro", "Não foi possível salvar suas preferências. Tente novamente.");
      }
    };
    savePreferences();
  }, [debouncedPreferences, profileId, isNewProfile, showAlert]);

  const handleLocationUpdate = useCallback(
    async (latitude: number, longitude: number) => {
      if (!user || !profileId) {
        console.log("[handleLocationUpdate] No user or profileId available");
        return;
      }
      try {
        console.log("[handleLocationUpdate] Updating location:", { latitude, longitude });
        const updateData =
          latitude === 0 && longitude === 0
            ? { latitude: null, longitude: null }
            : { latitude, longitude };
        const { error } = await supabase.from("profiles").update(updateData).eq("id", profileId as string);
        if (error) {
          console.error("[handleLocationUpdate] Error:", error.message);
          throw error;
        }
        console.log("[handleLocationUpdate] Location updated successfully");
      } catch (error) {
        console.error("[handleLocationUpdate] Error:", (error as Error).message);
        await showAlert("error", "Erro", "Não foi possível atualizar sua localização. Tente novamente.");
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
      setErrors((prevErrors) => {
        const newErrors = { ...prevErrors };
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
          case "whatsapp_number":
            if (value && !/^\+?\d{10,15}$/.test(value.replace(/\D/g, ""))) {
              newErrors.whatsapp_number = "Número de WhatsApp inválido.";
            } else {
              delete newErrors.whatsapp_number;
            }
            break;
        }
        return newErrors;
      });
    },
    [calculateAge]
  );

  const validateProfileData = useCallback(() => {
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
      newErrors.photos = "É necessário adicionar pelo menos uma foto para criar o perfil.";
    }
    if (
      !isNewProfile ||
      (photos.length > 0 && profileData.birth_date && !newErrors.birth_date)
    ) {
      if (!profileData.name.trim()) {
        newErrors.name = "O nome é obrigatório.";
      }
      if (!profileData.city.trim()) {
        newErrors.city = "A cidade é obrigatória.";
      }
      if (!profileData.profession.trim()) {
        newErrors.profession = "A profissão é obrigatória.";
      }
      if (profileData.bio.length > 500) {
        newErrors.bio = "A biografia deve ter no máximo 500 caracteres.";
      }
      if (
        profileData.whatsapp_number &&
        !/^\+?\d{10,15}$/.test(profileData.whatsapp_number.replace(/\D/g, ""))
      ) {
        newErrors.whatsapp_number = "Número de WhatsApp inválido.";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [profileData, photos, isNewProfile, calculateAge]);

  const isProfileComplete = useMemo(
    () => {
      // Logic for checking profile completeness
      const hasErrors = Object.keys(errors).length > 0;
      if (hasErrors) return false;
      
      const isComplete = (
        photos.length > 0 &&
        !!profileData.birth_date &&
        !!profileData.name.trim() &&
        !!profileData.gender &&
        !!profileData.city.trim() &&
        !!profileData.profession.trim() &&
        !!profileData.bio.trim() &&
        !!preferences.genderPreference &&
        preferences.minAge >= 18 &&
        preferences.maxAge <= 99 &&
        preferences.maxDistance >= 1
      );
      
      return isComplete;
    },
    [profileData, preferences, photos, errors]
  );

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
        popup.setAttribute("aria-live", "assertive");
      },
    });
    if (result.isConfirmed) {
      setSaving(true);
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.log("[handleLogout] Error:", error.message);
          throw error;
        }
        await showAlert("success", "Sucesso", "Você saiu da sua conta com sucesso!");
        router.push("/login");
      } catch (error) {
        console.log("[handleLogout] Error:", (error as Error).message);
        await showAlert(
          "error",
          "Erro",
          (error as Error).message === "too_many_requests"
            ? "Muitas tentativas. Tente novamente em alguns minutos."
            : "Não foi possível sair da sua conta. Tente novamente."
        );
      } finally {
        setSaving(false);
      }
    }
  };

  const loadProfileAndRelatedData = useCallback(
    async (currentProfileId: string) => {
      if (!currentProfileId) {
        console.log("[loadProfileAndRelatedData] Skipping: No profileId provided");
        setPhotos([]);
        setProfileData((prev) => ({ ...prev, interests: [] }));
        return;
      }

      try {
        // 1. Buscar Dados do Perfil
        const { data: dbProfile, error: profileError } = await supabase
          .from("profiles")
          .select(
            `
          id, name, birth_date, gender, bio, city, profession, latitude, longitude,
          whatsapp_number, share_whatsapp,
          gender_preference, min_age, max_age, max_distance, show_profile,
          match_notifications, message_notifications, avatar_url
        `
          )
          .eq("id", currentProfileId)
          .single();

        if (profileError) {
          console.error("[loadProfileAndRelatedData] Profile fetch error:", profileError.message);
          throw profileError;
        }

        if (dbProfile) {
          setProfileData((prev) => ({
            ...prev,
            name: dbProfile.name || "",
            birth_date: dbProfile.birth_date || "",
            gender: dbProfile.gender || "HOMEM",
            bio: dbProfile.bio || "",
            city: dbProfile.city || "",
            profession: dbProfile.profession || "",
            latitude: dbProfile.latitude || null,
            longitude: dbProfile.longitude || null,
            whatsapp_number: dbProfile.whatsapp_number || "",
            share_whatsapp: dbProfile.share_whatsapp ?? false,
          }));
          setPreferences({
            genderPreference: dbProfile.gender_preference || "TODOS",
            minAge: dbProfile.min_age || 18,
            maxAge: dbProfile.max_age || 50,
            maxDistance: dbProfile.max_distance || 50,
            showProfile: dbProfile.show_profile !== false,
            matchNotifications: dbProfile.match_notifications !== false,
            messageNotifications: dbProfile.message_notifications !== false,
          });
          setIsNewProfile(false);
        } else {
          setIsNewProfile(true);
        }

        // 2. Buscar Fotos
        console.log("[loadProfileAndRelatedData] Fetching photos for profile_id:", currentProfileId);
        const { data: photosData, error: photosError } = await supabase
          .from("profile_photos")
          .select("storage_path, is_primary")
          .eq("profile_id", currentProfileId)
          .order("created_at", { ascending: true });
        if (photosError) {
          console.error("[loadProfileAndRelatedData] Photos error:", photosError.message);
          throw photosError;
        }
        const photoUrls = await Promise.all(
          photosData.map(async (photo: { storage_path: string; is_primary: boolean }) => {
            const { data: publicUrlData } = supabase.storage.from("imagens").getPublicUrl(photo.storage_path);
            let url = publicUrlData.publicUrl;
            try {
              const response = await fetch(url, { method: "HEAD" });
              if (!response.ok) throw new Error("Public URL inaccessible");
            } catch {
              const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                .from("imagens")
                .createSignedUrl(photo.storage_path, 3600);
              if (signedUrlError) throw signedUrlError;
              url = signedUrlData.signedUrl;
            }
            return {
              name: photo.storage_path.split("/").pop()!,
              storage_path: photo.storage_path,
              publicUrl: url,
              isPrimary: photo.is_primary,
            };
          })
        );
        setPhotos(photoUrls);

        // 3. Buscar Interesses
        console.log("[loadProfileAndRelatedData] Fetching interests for profile_id:", currentProfileId);
        type ProfileInterestRow = {
          interests_id: number;
          interests: { name: string | null } | null;
        };
        const { data: profileInterestsData, error: profileInterestsError } = (await supabase
          .from("profile_interests")
          .select(
            `
          interests_id,
          interests (name)
        `
          )
          .eq("profile_id", currentProfileId)) as { data: ProfileInterestRow[] | null; error: any };

        if (profileInterestsError) {
          console.error("[loadProfileAndRelatedData] Profile interests error:", profileInterestsError.message);
          throw profileInterestsError;
        }

        const interestNames = (profileInterestsData || [])
          .map((item) => item.interests?.name)
          .filter((name): name is string => typeof name === "string" && name !== null);

        setProfileData((prev) => ({ ...prev, interests: interestNames }));
      } catch (error) {
        console.error("[loadProfileAndRelatedData] Error:", (error as Error).message);
        showAlert(
          "error",
          "Erro",
          (error as Error).message === "too_many_requests"
            ? "Muitas tentativas. Tente novamente em alguns minutos."
            : "Não foi possível carregar os dados do perfil. Tente novamente."
        );
        setPhotos([]);
        setProfileData((prev) => ({ ...prev, interests: [] }));
      }
    },
    [showAlert]
  );

  useEffect(() => {
    let mounted = true;
    const initializeProfile = async () => {
      if (isLoading || !user) {
        setProfileId(null);
        return;
      }

      if (profile && mounted) {
        setProfileId(profile.id);
        await loadProfileAndRelatedData(profile.id);
      } else if (!profile && user && mounted) {
        try {
          console.log("[initializeProfile] Fetching profile ID for user_id:", user.id);
          const { data, error } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();
          if (error && error.code !== "PGRST116") {
            console.error("[initializeProfile] Error fetching profile ID:", error.message);
            throw error;
          }
          if (mounted) {
            if (data) {
              setProfileId(data.id);
              setIsNewProfile(false);
              await loadProfileAndRelatedData(data.id);
            } else {
              setProfileId(null);
              setIsNewProfile(true);
            }
          }
        } catch (error) {
          console.error("[initializeProfile] Error during profile initialization:", (error as Error).message);
          if (mounted) {
            showAlert(
              "error",
              "Erro",
              (error as Error).message === "too_many_requests"
                ? "Muitas tentativas. Tente novamente em alguns minutos."
                : "Não foi possível carregar o perfil. Tente novamente."
            );
          }
        }
      }
    };
    initializeProfile();
    return () => {
      mounted = false;
    };
  }, [isLoading, user, profile, showAlert, loadProfileAndRelatedData]);

  const compressImage = async (file: File): Promise<File> => {
    try {
      const image = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
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
          width = Math.round((width * maxSize) / height);
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
              reject(new Error("Falha ao comprimir imagem"));
            }
          },
          file.type,
          0.8
        );
      });
    } catch (error) {
      console.log("[compressImage] Error:", (error as Error).message);
      throw error;
    }
  };

  const generateUsername = async (name: string): Promise<string> => {
    const baseUsername = "@" + name.toLowerCase().replace(/\s+/g, "");
    let username = baseUsername;
    let counter = 1;
    while (true) {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username)
        .single();
      if (error && error.code === "PGRST116") {
        break;
      } else if (error) {
        throw error;
      }
      username = `${baseUsername}${counter}`;
      counter++;
    }
    return username;
  };

  const handlePhotoUpload = useCallback(
    async (file: File) => {
      if (!user || !file) {
        await showAlert("error", "Erro", !user ? "Usuário não autenticado." : "Nenhum arquivo selecionado.");
        return;
      }
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      const maxSize = 5 * 1024 * 1024;
      if (!validTypes.includes(file.type)) {
        await showAlert("error", "Erro", "Envie uma imagem nos formatos JPEG, PNG ou WebP.");
        return;
      }
      if (file.size > maxSize || file.size === 0) {
        await showAlert(
          "error",
          "Erro",
          file.size > maxSize ? "A imagem deve ter no máximo 5MB." : "O arquivo está vazio ou corrompido."
        );
        return;
      }
      setUploading(true);
      try {
        const compressedFile = await compressImage(file);
        const fileExt = compressedFile.name.split(".").pop();
        const fileName = `${Date.now()}-${uuidv4()}.${fileExt}`;
        if (!user.id) {
          throw new Error("User ID is not available.");
        }
        const filePath = `${user.id}/${fileName}`;
        console.log("[handlePhotoUpload] Uploading to:", filePath);
        const { error: uploadError } = await supabase.storage
          .from("imagens")
          .upload(filePath, compressedFile, { contentType: file.type, upsert: false });
        if (uploadError) {
          console.log("[handlePhotoUpload] Upload error:", uploadError.message);
          throw uploadError;
        }

        let currentProfileId = profileId;
        if (!currentProfileId) {
          const username = await generateUsername(profileData.name || user.email?.split("@")[0] || "user");
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              user_id: user.id,
              username,
              created_at: new Date().toISOString(),
              name: profileData.name || null,
              birth_date: profileData.birth_date || null,
              gender: profileData.gender || null,
              bio: profileData.bio || null,
              city: profileData.city || null,
              profession: profileData.profession || null,
              interests: profileData.interests || [],
              latitude: profileData.latitude || null,
              longitude: profileData.longitude || null,
              whatsapp_number: profileData.whatsapp_number || null,
              share_whatsapp: profileData.share_whatsapp ?? false,
            })
            .select("id")
            .single();

          if (insertError) {
            console.error("[handlePhotoUpload] Profile insert error:", insertError.message);
            await supabase.storage.from("imagens").remove([filePath]);
            throw insertError;
          }
          currentProfileId = newProfile.id;
          setProfileId(newProfile.id);
          setIsNewProfile(false);
        }

        const isFirstPhoto = photos.length === 0;
        console.log("[handlePhotoUpload] Inserting photo for profile_id:", currentProfileId, "is_primary:", isFirstPhoto);

        if (currentProfileId) {
          const { error: updatePrimaryError } = await supabase
            .from("profile_photos")
            .update({ is_primary: false })
            .eq("profile_id", currentProfileId)
            .eq("is_primary", true);
          if (updatePrimaryError) {
            console.error("[handlePhotoUpload] Failed to set existing primary photos to false:", updatePrimaryError.message);
          }
        }

        const { error: insertError } = await supabase.from("profile_photos").insert({
          profile_id: currentProfileId,
          storage_path: filePath,
          is_primary: isFirstPhoto,
        });
        if (insertError) {
          console.log("[handlePhotoUpload] Insert error:", insertError.message);
          await supabase.storage.from("imagens").remove([filePath]);
          throw insertError;
        }
        const { data: urlData } = supabase.storage.from("imagens").getPublicUrl(filePath);
        if (isFirstPhoto && currentProfileId) {
          console.log("[handlePhotoUpload] Setting avatar_url:", urlData.publicUrl);
          const { error: avatarError } = await supabase
            .from("profiles")
            .update({ avatar_url: urlData.publicUrl })
            .eq("id", currentProfileId);
          if (avatarError) {
            console.log("[handlePhotoUpload] Avatar update error:", avatarError.message);
            throw avatarError;
          }
        }
        await showAlert("success", "Sucesso", `Foto ${isFirstPhoto ? "principal" : ""} enviada com sucesso!`);
        if (currentProfileId) {
          await loadProfileAndRelatedData(currentProfileId);
        }
      } catch (error) {
        console.log("[handlePhotoUpload] Error:", (error as Error).message);
        await showAlert(
          "error",
          "Erro",
          (error as Error).message === "too_many_requests"
            ? "Muitas tentativas. Tente novamente em alguns minutos."
            : (error as Error).message.includes("compress")
              ? "Falha ao comprimir a imagem. Tente outro arquivo."
              : "Não foi possível enviar sua foto. Tente novamente."
        );
      } finally {
        setUploading(false);
      }
    },
    [
      user,
      photos,
      profileId,
      showAlert,
      profileData.name,
      profileData.birth_date,
      profileData.gender,
      profileData.bio,
      profileData.city,
      profileData.profession,
      profileData.interests,
      profileData.latitude,
      profileData.longitude,
      profileData.whatsapp_number,
      profileData.share_whatsapp,
      loadProfileAndRelatedData,
    ]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      showAlert("error", "Erro", "Nenhum arquivo selecionado.");
      return;
    }
    handlePhotoUpload(file);
    e.target.value = "";
  };

  const handleDeletePhoto = useCallback(
    async (photoName: string) => {
      if (!user || !profileId) {
        await showAlert("error", "Erro", "Usuário ou perfil não encontrado.");
        return;
      }
      try {
        const filePath = `${user.id}/${photoName}`;
        console.log("[handleDeletePhoto] Deleting:", filePath);
        const { data: photoData, error: photoError } = await supabase
          .from("profile_photos")
          .select("is_primary")
          .eq("storage_path", filePath)
          .eq("profile_id", profileId as string)
          .single();
        if (photoError) {
          console.log("[handleDeletePhoto] Photo fetch error:", photoError.message);
          throw photoError;
        }
        const { error: deleteError } = await supabase.storage.from("imagens").remove([filePath]);
        if (deleteError) {
          console.log("[handleDeletePhoto] Delete error:", deleteError.message);
          throw deleteError;
        }
        const { error: dbError } = await supabase
          .from("profile_photos")
          .delete()
          .eq("storage_path", filePath)
          .eq("profile_id", profileId as string);
        if (dbError) {
          console.log("[handleDeletePhoto] DB error:", dbError.message);
          throw dbError;
        }
        if (photoData.is_primary) {
          const { data: remainingPhotos } = await supabase
            .from("profile_photos")
            .select("storage_path")
            .eq("profile_id", profileId as string)
            .order("created_at", { ascending: true })
            .limit(1);
          if (remainingPhotos && remainingPhotos.length > 0) {
            const { error: updatePrimaryError } = await supabase
              .from("profile_photos")
              .update({ is_primary: true })
              .eq("storage_path", remainingPhotos[0].storage_path)
              .eq("profile_id", profileId as string);
            if (updatePrimaryError) {
              console.log("[handleDeletePhoto] Update primary error:", updatePrimaryError.message);
              throw updatePrimaryError;
            }
            const { data: publicUrl } = supabase.storage.from("imagens").getPublicUrl(remainingPhotos[0].storage_path);
            const { error: avatarError } = await supabase
              .from("profiles")
              .update({ avatar_url: publicUrl.publicUrl })
              .eq("id", profileId as string);
            if (avatarError) {
              console.log("[handleDeletePhoto] Avatar error:", avatarError.message);
              throw avatarError;
            }
          } else {
            const { error: avatarError } = await supabase
              .from("profiles")
              .update({ avatar_url: null })
              .eq("id", profileId as string);
            if (avatarError) {
              console.log("[handleDeletePhoto] Avatar reset error:", avatarError.message);
              throw avatarError;
            }
          }
        }
        await showAlert("success", "Sucesso", "Foto excluída com sucesso.");
        if (profileId) {
          await loadProfileAndRelatedData(profileId);
        }
      } catch (error) {
        console.log("[handleDeletePhoto] Error:", (error as Error).message);
        await showAlert(
          "error",
          "Erro",
          (error as Error).message === "too_many_requests"
            ? "Muitas tentativas. Tente novamente em alguns minutos."
            : "Não foi possível remover a foto. Tente novamente."
        );
      }
    },
    [user, profileId, showAlert, loadProfileAndRelatedData]
  );

  const handleSetPrimaryPhoto = useCallback(
    async (storagePath: string) => {
      if (!user || !profileId) {
        await showAlert("error", "Erro", "Usuário ou perfil não encontrado.");
        return;
      }
      try {
        console.log("[handleSetPrimaryPhoto] Setting primary:", storagePath);
        await supabase
          .from("profile_photos")
          .update({ is_primary: false })
          .eq("profile_id", profileId as string)
          .neq("storage_path", storagePath);

        const { error: updateError } = await supabase
          .from("profile_photos")
          .update({ is_primary: true })
          .eq("storage_path", storagePath)
          .eq("profile_id", profileId as string);
        if (updateError) {
          console.log("[handleSetPrimaryPhoto] Update error:", updateError.message);
          throw updateError;
        }
        const { data: urlData } = supabase.storage.from("imagens").getPublicUrl(storagePath);
        console.log("[handleSetPrimaryPhoto] Updating avatar_url:", urlData.publicUrl);
        const { error: avatarError } = await supabase
          .from("profiles")
          .update({ avatar_url: urlData.publicUrl })
          .eq("id", profileId as string);
        if (avatarError) {
          console.log("[handleSetPrimaryPhoto] Avatar error:", avatarError.message);
          throw avatarError;
        }
        await showAlert("success", "Sucesso", "Foto principal atualizada!");
        if (profileId) {
          await loadProfileAndRelatedData(profileId);
        }
      } catch (error) {
        console.log("[handleSetPrimaryPhoto] Error:", (error as Error).message);
        await showAlert(
          "error",
          "Erro",
          (error as Error).message === "too_many_requests"
            ? "Muitas tentativas. Tente novamente em alguns minutos."
            : "Não foi possível definir esta foto como principal. Tente novamente."
        );
      }
    },
    [user, profileId, showAlert, loadProfileAndRelatedData]
  );

  const handleUpdateProfile = useCallback(async () => {
    if (!user || !validateProfileData()) {
      await showAlert(
        "error",
        "Erro",
        !user ? "Usuário não autenticado." : "Por favor, corrija os erros nos campos antes de salvar."
      );
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
        latitude: profileData.latitude,
        longitude: profileData.longitude,
        whatsapp_number: profileData.whatsapp_number || null,
        share_whatsapp: profileData.share_whatsapp ?? false,
        updated_at: new Date().toISOString(),
        avatar_url: photos.find((p) => p.isPrimary)?.publicUrl || photos[0]?.publicUrl || null,
      };
      console.log("[handleUpdateProfile] Saving profile:", profilePayload);
      let error;
      if (profileId) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ ...profilePayload, username: await generateUsername(profileData.name) })
          .eq("id", profileId as string);
        error = updateError;
      } else {
        const username = await generateUsername(
          profileData.name || user.email?.split("@")[0] || "user"
        );
        const { data, error: insertError } = await supabase
          .from("profiles")
          .insert({
            ...profilePayload,
            user_id: user.id,
            username,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        error = insertError;
        if (data) setProfileId(data.id);
        setIsNewProfile(false);
      }
      if (error) {
        console.log("[handleUpdateProfile] Save error:", error.message);
        throw error;
      }
      await showAlert(
        "success",
        "Sucesso",
        profileId ? "Perfil atualizado com sucesso!" : "Perfil criado com sucesso!"
      );
      if (profileId) {
        await loadProfileAndRelatedData(profileId);
      } else if (user?.id) {
        await loadProfileAndRelatedData(user.id);
      }
      if (!profileId) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.log("[handleUpdateProfile] Error:", (error as Error).message);
      await showAlert(
        "error",
        "Erro",
        (error as Error).message === "too_many_requests"
          ? "Muitas tentativas. Tente novamente em alguns minutos."
          : "Não foi possível salvar seu perfil. Tente novamente."
      );
    } finally {
      setSaving(false);
    }
  }, [
    user,
    profileData,
    photos,
    profileId,
    showAlert,
    router,
    validateProfileData,
    loadProfileAndRelatedData,
  ]);

  const profileCompletion = useMemo(
    () => calculateProfileCompletion(profileData, preferences, photos),
    [profileData, preferences, photos]
  );

  if (isLoading || (user && profileId === null && !isNewProfile)) {
    return (
      <div className="flex items-center justify-center h-screen" aria-label="Carregando">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (!user && !isLoading) {
    router.push("/login");
    return null;
  }

  const currentAvatarUrl =
    photos.find((p) => p.isPrimary)?.publicUrl || photos[0]?.publicUrl || profile?.avatar_url || "";
  const currentProfileName = profile?.name || profileData.name || "";

  return (
    <div className="min-h-screen bg-gray-100">
      <ProfileHeader name={currentProfileName} avatarUrl={currentAvatarUrl} />

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
              <span className="text-sm font-bold text-oraculo-cyan">
                {profileCompletion}%
              </span>
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
  );
}

// --- Componente InterestsPage (Idealmente em arquivo separado) ---
// Este componente deve estar em um arquivo separado, por exemplo, `app/interests/page.tsx`
// mantido aqui para completude da solução conforme a solicitação.

import { useSearchParams } from "next/navigation";
// import { CheckCircle2 } from "lucide-react";

function InterestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, isLoading: userLoading } = useUser();
  const [interests, setInterests] = useState<DBInterest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const interestType = searchParams.get("type");
  const INTEREST_LIMIT = 10; // Limite de interesses

  const MySwal = useMemo(() => withReactContent(Swal), []); // Memoiza MySwal

  const showAlert = useCallback(
    async (type: "success" | "error" | "info", title: string, text: string) => {
      return MySwal.fire({
        icon: type,
        title,
        text,
        customClass: {
          popup: "border-2 border-transparent bg-white rounded-2xl shadow-lg w-[90vw] max-w-sm",
          title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-xl font-bold",
          confirmButton: "bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-90",
        },
        willOpen: (popup) => {
          popup.setAttribute("aria-live", "assertive");
        },
      });
    },
    [MySwal]
  );

  const isProfileComplete = (
    profileData: ProfileData | null,
    preferences: Preferences | null,
    hasPhoto: boolean
  ): boolean => {
    if (!profileData || !preferences) return false;

    const requiredProfileFields: (keyof ProfileData)[] = [
      "name",
      "birth_date",
      "gender",
      "bio",
      "city",
      "profession",
    ];
    const isProfileDataComplete = requiredProfileFields.every(
      (field) => profileData[field] !== null && profileData[field] !== ""
    );

    const requiredPreferenceFields: (keyof Preferences)[] = [
      "genderPreference",
      "minAge",
      "maxAge",
      "maxDistance",
      "showProfile",
      "matchNotifications",
      "messageNotifications",
    ];
    const isPreferencesComplete = requiredPreferenceFields.every(
      (field) => preferences[field] !== null && preferences[field] !== undefined
    );

    return isProfileDataComplete && isPreferencesComplete && hasPhoto;
  };

  useEffect(() => {
    if (userLoading) return;

    if (!user || !profile) {
      showAlert("error", "Erro", "Usuário não autenticado. Faça login novamente.");
      router.push("/login");
      return;
    }

    const fetchInterests = async () => {
      try {
        let query = supabase
          .from("interests")
          .select("id, name, storage_path, type")
          .order("name", { ascending: true });

        if (interestType) {
          query = query.eq("type", interestType);
        }

        const { data: interestsData, error: interestsError } = await query;

        if (interestsError) {
          throw new Error("Erro ao carregar interesses: " + interestsError.message);
        }

        const { data: userInterests, error: userInterestsError } = await supabase
          .from("profile_interests")
          .select("interests_id")
          .eq("profile_id", profile.id);

        if (userInterestsError) {
          throw new Error("Erro ao carregar interesses do usuário: " + userInterestsError.message);
        }

        setInterests(interestsData || []);
        setSelectedInterests(userInterests?.map((item) => item.interests_id) || []);
      } catch (error: any) {
        console.error("Fetch interests error:", error);
        await showAlert("error", "Erro", error.message || "Não foi possível carregar os interesses.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterests();
  }, [user, profile, userLoading, router, interestType, showAlert]);

  const handleInterestToggle = (interestId: number) => {
    setSelectedInterests((prev) => {
      if (prev.includes(interestId)) {
        return prev.filter((id) => id !== interestId);
      }
      if (prev.length >= INTEREST_LIMIT) {
        showAlert(
          "info",
          "Limite atingido",
          `Você pode selecionar até ${INTEREST_LIMIT} interesses. Desmarque um para adicionar outro.`
        );
        return prev;
      }
      return [...prev, interestId];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedInterests.length === 0 || selectedInterests.length > INTEREST_LIMIT) {
      await showAlert("error", "Número de Interesses Inválido", `Você deve selecionar entre 1 e ${INTEREST_LIMIT} interesses.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: deleteError } = await supabase
        .from("profile_interests")
        .delete()
        .eq("profile_id", profile?.id);

      if (deleteError) {
        throw new Error("Erro ao atualizar interesses: " + deleteError.message);
      }

      const inserts = selectedInterests.map((interestId) => ({
        profile_id: profile?.id,
        interests_id: interestId,
      }));

      const { error: insertError } = await supabase.from("profile_interests").insert(inserts);
      if (insertError) {
        throw new Error("Erro ao salvar interesses: " + insertError.message);
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "name, birth_date, gender, bio, city, profession, gender_preference, min_age, max_age, max_distance, show_profile, match_notifications, message_notifications, latitude, longitude, whatsapp_number, share_whatsapp"
        )
        .eq("id", profile?.id)
        .single();

      if (profileError) {
        throw new Error("Erro ao verificar perfil: " + profileError.message);
      }

      const { data: photos, error: photosError } = await supabase
        .from("profile_photos")
        .select("id")
        .eq("profile_id", profile?.id)
        .limit(1);

      if (photosError) {
        throw new Error("Erro ao verificar fotos: " + photosError.message);
      }

      const profileComplete = isProfileComplete(
        {
          name: profileData.name,
          birth_date: profileData.birth_date,
          gender: profileData.gender,
          bio: profileData.bio,
          city: profileData.city,
          profession: profileData.profession,
          interests: selectedInterests.map((id) => interests.find((i) => i.id === id)?.name || ""),
          latitude: profileData.latitude,
          longitude: profileData.longitude,
          whatsapp_number: profileData.whatsapp_number,
          share_whatsapp: profileData.share_whatsapp,
        },
        {
          genderPreference: profileData.gender_preference,
          minAge: profileData.min_age,
          maxAge: profileData.max_age,
          maxDistance: profileData.max_distance,
          showProfile: profileData.show_profile,
          matchNotifications: profileData.match_notifications,
          messageNotifications: profileData.message_notifications,
        },
        photos?.length > 0
      );

      await showAlert("success", "Interesses salvos!", "Redirecionando...");

      if (!profileComplete) {
        router.push("/profile");
      } else {
        router.push("/discover/v6");
      }
    } catch (error: any) {
      console.error("Submit interests error:", error);
      await showAlert("error", "Erro", error.message || "Não foi possível salvar os interesses.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFullImageUrl = (path: string | null): string => {
    if (!path) return "/images/placeholder-interest.jpg";
    return `https://wthyagnvodxbvmxkjhzb.supabase.co/storage/v1/object/public/interests/${path}`;
  };

  if (isLoading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E1E1E]" />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      <div className="w-full max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] mb-4 text-center">
            Escolha Seus Interesses{interestType ? ` - ${interestType}` : ""}
          </h2>
          <p className="text-neutral-600 mb-6 text-center">
            Clique em até **{INTEREST_LIMIT} interesses** para personalizar sua experiência.
            Você selecionou **{selectedInterests.length} de {INTEREST_LIMIT}**.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
              {interests.length > 0 ? (
                interests.map((interest, index) => (
                  <motion.div
                    key={interest.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`relative rounded-lg overflow-hidden h-32 cursor-pointer transition-all duration-200 ${
                      selectedInterests.includes(interest.id)
                        ? "border-4 border-[#00FFD1] shadow-lg"
                        : "border-2 border-gray-200 hover:border-oraculo-cyan"
                    }`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selectedInterests.includes(interest.id)}
                    aria-label={`Selecionar interesse ${interest.name}`}
                    onClick={() => handleInterestToggle(interest.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleInterestToggle(interest.id);
                      }
                    }}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${getFullImageUrl(interest.storage_path)})`,
                      }}
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Label className="text-white text-sm font-semibold text-center px-2">
                        {interest.name}
                      </Label>
                    </div>
                    {selectedInterests.includes(interest.id) && (
                      <div className="absolute top-2 right-2 bg-[#00FFD1] rounded-full p-1">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </motion.div>
                ))
              ) : (
                <p className="text-neutral-600 text-center col-span-full">
                  Nenhum interesse encontrado para o tipo selecionado.
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-white hover:opacity-90 focus:ring-2 focus:ring-[#1E1E1E]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </span>
              ) : (
                <>
                  Salvar Interesses
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}