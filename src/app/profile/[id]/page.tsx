"use client";
import type React from "react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { Loader2, Heart, MessageSquare, Sparkles, MapPin, Navigation, HeartPulseIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ProfileHeader } from "@/components/profile-header";
import { Badge } from "@/components/ui/badge";
import { FaWhatsapp } from "react-icons/fa";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@radix-ui/react-label";

// Constants
const MySwal = withReactContent(Swal);
const SWAL_CONFIG = {
  popup: "border-2 border-transparent bg-white rounded-xl",
  title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-xl font-bold",
  confirmButton: "bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-white px-4 py-2 rounded shadow",
};
const ROUTES = {
  LOGIN: "/login",
  DISCOVER: "/oraculo",
  SUBSCRIPTION: "/subscription",
  MESSAGES: (id: string) => `/messages/${id}`,
};
const PLACEHOLDER_IMAGE = "/placeholder-image.png";

// Types
type Gender = "HOMEM" | "MULHER" | "NAO_BINARIO" | "OUTRO";
type Photo = { name: string; storage_path: string; publicUrl: string; isPrimary: boolean };
type ProfileData = {
  id: string;
  name: string;
  birth_date?: string;
  gender?: Gender;
  bio?: string;
  city?: string;
  profession?: string;
  interests: string[] | null;
  avatar_url: string | null;
  user_id: string;
  latitude?: number | null;
  longitude?: number | null;
  whatsapp_number?: string;
  share_whatsapp?: boolean;
  email?: string;
};
type LoggedInUserProfile = ProfileData & {
  gender_preference?: 'HOMEM' | 'MULHER' | 'TODOS';
  min_age?: number;
  max_age?: number;
  max_distance?: number;
  show_profile?: boolean;
  match_notifications?: boolean;
  message_notifications?: boolean;
  subscription?: boolean;
};

// Utility Functions
const handleError = (error: any, title: string, router: any, redirectRoute: string) => {
  MySwal.fire({
    icon: "error",
    title,
    html: `<p class="text-lg text-gray-700">${error.message || "Ocorreu um erro."}</p>`,
    customClass: SWAL_CONFIG,
    confirmButtonText: "Voltar",
  }).then((result) => result.isConfirmed && router.push(redirectRoute));
};

const calculateAge = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  if (isNaN(birth.getTime()) || birth > today || birth.getFullYear() < 1900) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 18 && age <= 120 ? age : null;
};

const getZodiacSign = (birthDate?: string): { sign: string; emoji: string } => {
  if (!birthDate) return { sign: "Desconhecido", emoji: "" };
  const date = new Date(birthDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return { sign: "Áries", emoji: "♈" };
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return { sign: "Touro", emoji: "♉" };
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return { sign: "Gêmeos", emoji: "♊" };
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return { sign: "Câncer", emoji: "♋" };
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return { sign: "Leão", emoji: "♌" };
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return { sign: "Virgem", emoji: "♍" };
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return { sign: "Libra", emoji: "♎" };
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return { sign: "Escorpião", emoji: "♏" };
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return { sign: "Sagitário", emoji: "♐" };
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return { sign: "Capricórnio", emoji: "♑" };
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return { sign: "Aquário", emoji: "♒" };
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return { sign: "Peixes", emoji: "♓" };
  return { sign: "Desconhecido", emoji: "" };
};

const fetchPhotoUrls = async (photos: any[]): Promise<Photo[]> => {
  return Promise.all(
    photos.map(async (photo) => {
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
};

const calculateCompatibilityPercentage = (
  loggedInUserProfile: LoggedInUserProfile | null,
  viewedProfileData: ProfileData | null
): number => {
  if (!loggedInUserProfile || !viewedProfileData) return 0;
  let score = 0;
  const userInterests = Array.isArray(loggedInUserProfile.interests) ? loggedInUserProfile.interests : [];
  const viewedInterests = Array.isArray(viewedProfileData.interests) ? viewedProfileData.interests : [];
  const commonInterests = userInterests.filter(interest => viewedInterests.includes(interest));
  score += Math.min(commonInterests.length * 5, 50);
  if (loggedInUserProfile.gender_preference && viewedProfileData.gender &&
      (loggedInUserProfile.gender_preference === 'TODOS' || 
       loggedInUserProfile.gender_preference === viewedProfileData.gender)) {
    score += 20;
  }
  const viewedAge = calculateAge(viewedProfileData.birth_date);
  if (viewedAge !== null) {
    if (viewedAge >= (loggedInUserProfile.min_age || 18) && viewedAge <= (loggedInUserProfile.max_age || 99)) {
      score += 20;
    }
  }
  if (loggedInUserProfile.latitude && loggedInUserProfile.longitude &&
      viewedProfileData.latitude && viewedProfileData.longitude &&
      loggedInUserProfile.id !== viewedProfileData.id) {
    score += 10;
  }
  return Math.min(Math.round(score), 100);
};

// LocationCapture Component (Minimalista)
type LocationState = {
  status: "idle" | "requesting" | "granted" | "denied" | "unavailable" | "error";
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  accuracy: number | null;
};

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
  const DEBOUNCE_ALERT_TIME = 5000;

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
          setProfileData({ ...profileData, latitude, longitude });
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
    [isGeolocationSupported, profileData, setProfileData, onLocationUpdate]
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
          getCurrentLocation(false);
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
      console.log(error);
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
      getCurrentLocation(true);
    }
  }, [isGeolocationSupported, getCurrentLocation]);

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
      setProfileData({ ...profileData, latitude: null, longitude: null });
      onLocationUpdate(0, 0);
    }
  }, [profileData, setProfileData, onLocationUpdate]);

  useEffect(() => {
    checkPermissionStatus();
  }, [checkPermissionStatus]);

  useEffect(() => {
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
        return `Localização capturada (${Math.round(locationState.accuracy || 0)}m)`;
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
              <Button
                variant="ghost"
                id="location-action"
                onClick={requestLocation}
                disabled={saving || uploading}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                {renderLocationIcon()}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{renderTooltipContent()}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {locationState.status === "granted" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => getCurrentLocation(true)}
                  disabled={saving || uploading}
                  className="rounded-full p-2 hover:bg-gray-100"
                  aria-label="Atualizar localização"
                >
                  <Navigation className="h-5 w-5 text-green-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar localização</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {(locationState.status === "granted" || (profileData.latitude !== null && profileData.longitude !== null)) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={clearLocation}
                  disabled={saving || uploading}
                  className="rounded-full p-2 hover:bg-red-50"
                  aria-label="Remover localização"
                >
                  <MapPin className="h-5 w-5 text-red-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remover localização</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {locationState.status === "denied" && (
        <p className="text-sm text-red-500">Permissão de localização negada. Ative nas configurações do navegador.</p>
      )}
      {locationState.status === "unavailable" && (
        <p className="text-sm text-yellow-500">Geolocalização não disponível neste dispositivo.</p>
      )}
    </div>
  );
};

// ProfileInfo Component
const ProfileInfo = ({
  profileData,
  calculateAge,
  isOwnProfile,
  onUpdateInterests,
  compatibilityPercentage,
  dailyCard
}: {
  profileData: ProfileData | null;
  calculateAge: (birthDate?: string) => number | null;
  isOwnProfile: boolean;
  onUpdateInterests: (interests: string[]) => Promise<void>;
  compatibilityPercentage?: number | null;
  dailyCard?: string | null;
}) => {
  const zodiac = useMemo(() => profileData ? getZodiacSign(profileData.birth_date) : { sign: "Desconhecido", emoji: "" }, [profileData]);
  const [newInterest, setNewInterest] = useState("");
  const [savingInterests, setSavingInterests] = useState(false);

  const handleAddInterest = async () => {
    if (!profileData || !newInterest.trim() || newInterest.length > 50) {
      MySwal.fire({
        icon: "error",
        title: "Erro",
        html: `<p class="text-sm text-gray-700">${
          !newInterest.trim() ? "Digite um interesse." : "O interesse deve ter no máximo 50 caracteres."
        }</p>`,
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
      return;
    }
    if (profileData.interests && profileData.interests.length >= 10) {
      MySwal.fire({
        icon: "info",
        title: "Limite de Interesses Atingido",
        html: '<p class="text-sm text-gray-700">Você pode ter no máximo 10 interesses. Remova um para adicionar outro.</p>',
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
      return;
    }
    if (profileData.interests && profileData.interests.includes(newInterest.trim())) {
      MySwal.fire({
        icon: "info",
        title: "Interesse Duplicado",
        html: '<p class="text-sm text-gray-700">Este interesse já foi adicionado.</p>',
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
      return;
    }
    setSavingInterests(true);
    try {
      const updatedInterests = [...(profileData.interests || []), newInterest.trim()];
      await onUpdateInterests(updatedInterests);
      setNewInterest("");
      MySwal.fire({
        icon: "success",
        title: "Interesse Adicionado",
        html: '<p class="text-sm text-success">Interesse adicionado com sucesso!</p>',
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
    } catch (error: any) {
      MySwal.fire({
        icon: "error",
        title: "Erro",
        html: `<p class="text-sm text-gray-700">Não foi possível adicionar o interesse. Tente novamente.</p>`,
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
    } finally {
      setSavingInterests(false);
    }
  };

  const handleRemoveInterest = async (interest: string) => {
    if (!profileData) return;
    setSavingInterests(true);
    try {
      const updatedInterests = (profileData.interests || []).filter((i) => i !== interest);
      await onUpdateInterests(updatedInterests);
      MySwal.fire({
        icon: "success",
        title: "Interesse Removido",
        html: '<p class="text-sm text-success">Interesse removido com sucesso!</p>',
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
    } catch (error: any) {
      MySwal.fire({
        icon: "error",
        title: "Erro",
        html: `<p class="text-sm text-gray-700">Não foi possível remover o interesse. Tente novamente.</p>`,
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
    } finally {
      setSavingInterests(false);
    }
  };

  return (
    <Card className="mb-6 border-none shadow-sm">
      <CardContent className="pt-6">
        {profileData ? (
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col items-center space-y-2">
              <Avatar className="w-24 h-24">
                <AvatarImage
                  src={profileData.avatar_url || PLACEHOLDER_IMAGE}
                  alt={profileData.name}
                  className="object-cover"
                  onError={(e) => (e.currentTarget.src = PLACEHOLDER_IMAGE)}
                />
                <AvatarFallback className="text-2xl">{profileData.name.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-oraculo-dark">{profileData.name}</h3>
                {!isOwnProfile && typeof compatibilityPercentage === 'number' && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-lg font-extrabold mt-1"
                    style={{
                      background: `linear-gradient(90deg, #1E1E1E, ${
                        compatibilityPercentage >= 75
                          ? '#4CAF50'
                          : compatibilityPercentage >= 50
                          ? '#FFC107'
                          : '#F44336'
                      })`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {compatibilityPercentage}% de Compatibilidade
                  </motion.p>
                )}
                <div className="flex items-center justify-center gap-2">
                  {calculateAge(profileData.birth_date) && (
                    <p className="text-sm text-oraculo-muted">
                      {calculateAge(profileData.birth_date)} anos
                    </p>
                  )}
                  {zodiac.sign !== "Desconhecido" && (
                    <p className="text-sm text-oraculo-muted">
                      {zodiac.emoji} {zodiac.sign}
                    </p>
                  )}
                </div>
                <p className="text-sm text-oraculo-muted">{profileData.city || "Cidade não informada"}</p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700">Profissão</h4>
              <p className="text-oraculo-muted">{profileData.profession || "Não informado"}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700">Sobre</h4>
              <p className="text-oraculo-muted">{profileData.bio || "Sem biografia"}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700">WhatsApp</h4>
              <p className="text-oraculo-muted">
                {profileData.share_whatsapp && profileData.whatsapp_number
                  ? "WhatsApp compartilhado"
                  : "WhatsApp não compartilhado"}
              </p>
            </div>
            {!isOwnProfile && dailyCard && (
              <div>
                <h4 className="text-sm font-medium text-gray-700">Carta do Dia</h4>
                <p className="text-oraculo-muted">{dailyCard}</p>
              </div>
            )}
            <div>
              <h4 className="text-sm font-medium text-gray-700">Interesses</h4>
              {profileData.interests && profileData.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profileData.interests.map((interest, index) => (
                    <Badge
                      key={index}
                      className="bg-[#1E1E1E]/10 text-[#1E1E1E] text-xs"
                    >
                      {interest}
                      {isOwnProfile && (
                        <button
                          onClick={() => handleRemoveInterest(interest)}
                          className="ml-2 text-red-500 hover:text-red-700"
                          aria-label={`Remover interesse ${interest}`}
                          disabled={savingInterests}
                        >
                          &times;
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-oraculo-muted">Nenhum interesse cadastrado.</p>
              )}
              {isOwnProfile && (
                <div className="mt-4 space-y-2">
                  <Input
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="Adicionar novo interesse"
                    maxLength={50}
                    disabled={savingInterests}
                    aria-label="Adicionar novo interesse"
                  />
                  <Button
                    onClick={handleAddInterest}
                    disabled={savingInterests || !newInterest.trim()}
                    className="w-full gradient-button"
                    aria-label="Adicionar interesse"
                  >
                    {savingInterests ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Salvando...
                      </>
                    ) : (
                      "Adicionar Interesse"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-oraculo-muted">Nenhuma informação disponível.</p>
        )}
      </CardContent>
    </Card>
  );
};

// ProfilePhotos Component
const ProfilePhotos = ({ photos }: { photos: Photo[] }) => (
  <Card className="mb-6 border-none shadow-sm">
    <CardHeader>
      <CardTitle>Fotos</CardTitle>
      <CardDescription>Fotos do perfil do usuário</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.length === 0 ? (
          <div className="col-span-3 text-center py-12 border border-dashed rounded-md">
            <p className="text-oraculo-muted">Sem fotos disponíveis.</p>
          </div>
        ) : (
          photos.map((photo, index) => (
            <div key={photo.storage_path} className="relative">
              <img
                src={photo.publicUrl}
                alt={`Foto ${index + 1}`}
                className={`w-full h-48 object-cover rounded-md ${photo.isPrimary ? "ring-2 ring-[#1E1E1E]" : ""}`}
                loading="lazy"
                onError={(e) => (e.currentTarget.src = PLACEHOLDER_IMAGE)}
              />
              {photo.isPrimary && (
                <Badge className="absolute top-2 left-2 bg-[#1E1E1E] text-white text-xs">
                  Principal
                </Badge>
              )}
            </div>
          ))
        )}
      </div>
    </CardContent>
  </Card>
);

// Main Component
export default function ProfileView() {
  const router = useRouter();
  const { user, isLoading: userLoading, profile } = useUser();
  const { id: profileId } = useParams() as { id: string };
  const [activeTab, setActiveTab] = useState<"informacoes" | "fotos">("informacoes");
  const [viewedProfileData, setViewedProfileData] = useState<ProfileData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLiked, setHasLiked] = useState(false);
  const [canLikeToday, setCanLikeToday] = useState(true);
  const [hasMatch, setHasMatch] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [matchAlertShown, setMatchAlertShown] = useState(false);
  const [compatibilityPercentage, setCompatibilityPercentage] = useState<number | null>(null);
  const [dailyCard, setDailyCard] = useState<string | null>(null);
  const hasPremiumSubscription = useMemo(() => !!profile?.subscription, [profile]);
  const isOwnProfile = useMemo(() => profile?.id === profileId, [profile, profileId]);
  const hasLoadedProfileRef = useRef<Record<string, boolean>>({});

  const showMatchAlert = useCallback(() => {
    if (matchAlertShown || !viewedProfileData) return;
    MySwal.fire({
      icon: "success",
      title: "É um Match!",
      html: `<p class="text-lg text-gray-700">
        Vocês são uma conexão cósmica, ${viewedProfileData.name || "!"}! O universo alinhou seus caminhos.
        ${hasPremiumSubscription ? "Que tal enviar uma mensagem?" : "Faça um upgrade para Premium!"}
      </p>`,
      customClass: SWAL_CONFIG,
      confirmButtonText: hasPremiumSubscription ? "Enviar Mensagem" : "Fazer Upgrade",
      willOpen: (popup) => popup.setAttribute("aria-live", "assertive"),
    }).then((result) => {
      if (result.isConfirmed) {
        if (hasPremiumSubscription && viewedProfileData.id) {
          router.push(ROUTES.MESSAGES(viewedProfileData.id));
        } else {
          router.push(ROUTES.SUBSCRIPTION);
        }
      }
    });
    setMatchAlertShown(true);
  }, [viewedProfileData, matchAlertShown, hasPremiumSubscription, router]);

  const handleUpdateInterests = useCallback(async (interests: string[]) => {
    if (!profile || !profile.id) {
      throw new Error("Usuário logado ou ID do perfil não disponível.");
    }
    try {
      const { data: allInterests, error: fetchInterestsError } = await supabase
        .from('interests')
        .select('id, name')
        .in('name', interests);
      if (fetchInterestsError) {
        throw new Error(`Erro ao buscar IDs dos interesses: ${fetchInterestsError.message}`);
      }
      const interestIdsToUpdate = allInterests.map(interest => interest.id);
      const { error: deleteError } = await supabase
        .from("profile_interests")
        .delete()
        .eq("profile_id", profile.id);
      if (deleteError) {
        throw new Error(`Erro ao apagar interesses antigos: ${deleteError.message}`);
      }
      const inserts = interestIdsToUpdate.map(id => ({
        profile_id: profile.id,
        interests_id: id,
      }));
      if (inserts.length > 0) {
        const { error: insertError } = await supabase
          .from("profile_interests")
          .insert(inserts);
        if (insertError) {
          throw new Error(`Erro ao inserir novos interesses: ${insertError.message}`);
        }
      }
      setViewedProfileData(prev => prev ? { ...prev, interests } : null);
      if (isOwnProfile && profileId) {
        hasLoadedProfileRef.current[profileId] = false;
      }
    } catch (error: any) {
      console.error("Erro em handleUpdateInterests:", error);
      throw error;
    }
  }, [profile, isOwnProfile, profileId]);

  const loadProfile = useCallback(async () => {
    if (userLoading || !user || !profile || !profileId) {
      if (!userLoading && !user) {
        handleError(new Error("Você precisa estar logado para ver perfis."), "Não autenticado", router, ROUTES.LOGIN);
      }
      return;
    }
    if (hasLoadedProfileRef.current[profileId]) {
      return;
    }
    setIsLoading(true);
    try {
      const queries = [
        supabase
          .from("profiles")
          .select("id, user_id, name, birth_date, gender, bio, city, profession, avatar_url, latitude, longitude, whatsapp_number, share_whatsapp")
          .eq("id", profileId)
          .single(),
        supabase
          .from("profile_photos")
          .select("storage_path, is_primary")
          .eq("profile_id", profileId)
          .order("created_at", { ascending: true }),
        supabase
          .from("likes")
          .select("id")
          .eq("profile_id", profile.id)
          .eq("liked_profile_id", profileId)
          .single(),
        supabase
          .from("matches")
          .select("id")
          .or(`profile1_id.eq.${profile.id},profile2_id.eq.${profile.id}`)
          .or(`profile1_id.eq.${profileId},profile2_id.eq.${profileId}`)
          .single(),
        supabase
          .from("profile_interests")
          .select(`interests_id, interests (name)`)
          .eq("profile_id", profileId),
      ];

      let dailyCardResponse: { data: { card_name: string } | null; error: any } | undefined;
      if (hasPremiumSubscription && !isOwnProfile) {
        try {
          const { data, error } = await supabase
            .from("daily_cards")
            .select("card_name")
            .eq("profile_id", profileId)
            .eq("selected_date", new Date().toISOString().split('T')[0])
            .single();
          dailyCardResponse = { data, error };
        } catch (error: any) {
          if (error.code === '42P01' || error.code === 'PGRST116') {
            dailyCardResponse = { data: null, error: null };
          } else {
            throw new Error(`Erro ao carregar carta do dia: ${error.message}`);
          }
        }
      }

      const [
        { data: profileDataResponse, error: profileError },
        { data: photosDataResponse, error: photosError },
        { data: likeDataResponse, error: likeError },
        { data: matchDataResponse, error: errorMatch },
        { data: profileInterestsData, error: profileInterestsError },
      ] = await Promise.all(queries);

      if (profileError) throw new Error(`Erro ao carregar perfil: ${profileError.message}`);
      if (photosError) throw new Error(`Erro ao carregar fotos: ${photosError.message}`);
      if (likeError && likeError.code !== "PGRST116") throw new Error(`Erro ao carregar curtida: ${likeError.message}`);
      if (errorMatch && errorMatch.code !== "PGRST116") throw new Error(`Erro ao carregar match: ${errorMatch.message}`);
      if (profileInterestsError) throw new Error(`Erro ao carregar interesses: ${profileInterestsError.message}`);

      // ✅ Correção 1: Garantir que profileInterestsData é array
      const interestsNames = Array.isArray(profileInterestsData)
        ? profileInterestsData
            .map(item => item.interests?.name)
            .filter((name): name is string => typeof name === 'string')
        : [];

      // ✅ Correção 2: Garantir que todos os campos estão presentes
      const loadedProfileData: ProfileData = {
        id: profileDataResponse.id,
        name: profileDataResponse.name,
        birth_date: profileDataResponse.birth_date || undefined,
        gender: profileDataResponse.gender as Gender | undefined,
        bio: profileDataResponse.bio || undefined,
        city: profileDataResponse.city || undefined,
        profession: profileDataResponse.profession || undefined,
        avatar_url: profileDataResponse.avatar_url || null,
        user_id: profileDataResponse.user_id,
        latitude: profileDataResponse.latitude || null,
        longitude: profileDataResponse.longitude || null,
        whatsapp_number: profileDataResponse.whatsapp_number || undefined,
        share_whatsapp: profileDataResponse.share_whatsapp || undefined,
        email: profileDataResponse.email || undefined,
        interests: interestsNames.length > 0 ? interestsNames : [],
      };

      // ✅ Correção 3: Verificar se photosDataResponse é array
      setPhotos(
        Array.isArray(photosDataResponse)
          ? await fetchPhotoUrls(photosDataResponse)
          : []
      );

      setViewedProfileData(loadedProfileData);
      setHasLiked(!!likeDataResponse);
      setCanLikeToday(!likeDataResponse);
      setHasMatch(!!matchDataResponse);
      setMatchAlertShown(false);
      setDailyCard(dailyCardResponse?.data?.card_name || null);

      // ✅ Correção 4: Normalizar avatar_url para null se undefined
      if (profile && loadedProfileData && !isOwnProfile) {
        const normalizedProfile: LoggedInUserProfile = {
          ...profile,
          avatar_url: profile.avatar_url ?? null,
          interests: Array.isArray(profile.interests) ? profile.interests : [],
        };
        const comp = calculateCompatibilityPercentage(normalizedProfile, loadedProfileData);
        setCompatibilityPercentage(comp);
      } else {
        setCompatibilityPercentage(null);
      }

      if (matchDataResponse && !matchAlertShown) showMatchAlert();
      hasLoadedProfileRef.current[profileId] = true;
    } catch (error: any) {
      console.error("Erro no loadProfile:", error);
      handleError(error, "Erro ao Carregar Perfil", router, ROUTES.DISCOVER);
    } finally {
      setIsLoading(false);
    }
  }, [userLoading, user, profile, profileId, router, showMatchAlert, isOwnProfile, matchAlertShown, hasPremiumSubscription]);

  const handleLike = useCallback(async () => {
    if (!user || !profile || !profileId) {
      MySwal.fire({
        icon: "error",
        title: "Erro",
        html: '<p class="text-sm text-gray-700">Usuário ou perfil inválido.</p>',
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
      return;
    }
    if (!canLikeToday) {
      MySwal.fire({
        icon: "info",
        title: "Limite Diário",
        html: '<p class="text-sm text-gray-700">Você já curtiu este perfil hoje. Tente novamente amanhã!</p>',
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
      return;
    }
    try {
      const { error } = await supabase.from("likes").insert({
        profile_id: profile.id,
        liked_profile_id: profileId,
        created_at: new Date().toISOString(),
      });
      if (error) throw new Error(`Erro ao curtir: ${error.message}`);
      setHasLiked(true);
      setCanLikeToday(false);
      MySwal.fire({
        icon: "success",
        title: "Perfil Curtido!",
        html: '<p class="text-sm text-success">Você curtiu este perfil! Aguardando um match...</p>',
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
      const { data: mutualLike, error: mutualLikeError } = await supabase
        .from("likes")
        .select("id")
        .eq("profile_id", profileId)
        .eq("liked_profile_id", profile.id)
        .single();
      if (mutualLikeError && mutualLikeError.code !== "PGRST116") throw new Error(`Erro ao verificar match: ${mutualLikeError.message}`);
      if (mutualLike) {
        setHasMatch(true);
        showMatchAlert();
      }
    } catch (error: any) {
      MySwal.fire({
        icon: "error",
        title: "Erro ao Curtir",
        html: `<p class="text-sm text-gray-700">${
          error.message.includes("too_many_requests")
            ? "Muitas tentativas. Tente novamente em alguns minutos."
            : "Não foi possível curtir o perfil."
        }</p>`,
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
    }
  }, [user, profile, profileId, canLikeToday, showMatchAlert]);

  const handleSendMessage = useCallback(async () => {
    if (!user || !viewedProfileData?.id) {
      console.log("[handleSendMessage] Validation failed: Missing user or profile", { user, profileId: viewedProfileData?.id });
      MySwal.fire({
        icon: "error",
        title: "Erro",
        html: `<p class="text-sm text-gray-700">${
          !user ? "Usuário não autenticado." : "Perfil inválido."
        }</p>`,
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
      return;
    }
    if (!hasMatch) {
      console.log("[handleSendMessage] Validation failed: No match", { hasMatch, profileId, userProfileId: profile?.id });
      MySwal.fire({
        icon: "error",
        title: "Erro",
        html: '<p class="text-sm text-gray-700">Vocês ainda não deram match.</p>',
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
      return;
    }
    if (!hasPremiumSubscription) {
      console.log("[handleSendMessage] Validation failed: Not premium", { hasPremiumSubscription, userId: user.id });
      MySwal.fire({
        icon: "info",
        title: "Assinatura Necessária",
        html: '<p class="text-sm text-gray-700">Você precisa de uma assinatura Premium para enviar mensagens.</p>',
        customClass: SWAL_CONFIG,
        confirmButtonText: "Fazer Upgrade",
      }).then((result) => result.isConfirmed && router.push(ROUTES.SUBSCRIPTION));
      return;
    }
    if (!viewedProfileData?.share_whatsapp || !viewedProfileData?.whatsapp_number) {
      console.log("[handleSendMessage] Validation failed: WhatsApp not shared", {
        share_whatsapp: viewedProfileData?.share_whatsapp,
        whatsapp_number: viewedProfileData?.whatsapp_number,
      });
      MySwal.fire({
        icon: "info",
        title: "Contato Indisponível",
        html: '<p class="text-sm text-gray-700">Este usuário não compartilhou o número de WhatsApp.</p>',
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
      return;
    }
    if (!message.trim()) {
      console.log("[handleSendMessage] Validation failed: Empty message");
      MySwal.fire({
        icon: "error",
        title: "Erro",
        html: '<p class="text-sm text-gray-700">Digite uma mensagem.</p>',
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
      return;
    }

    let cleanedNumber = viewedProfileData.whatsapp_number.replace(/[\s()-]/g, "");
    if (!cleanedNumber.startsWith("+")) {
      cleanedNumber = `+55${cleanedNumber}`;
    }

    if (!/^\+?\d{10,15}$/.test(cleanedNumber)) {
      MySwal.fire({
        icon: "error",
        title: "Erro",
        html: '<p class="text-sm text-gray-700">Número de WhatsApp inválido. Deve conter 10 a 15 dígitos.</p>',
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
      return;
    }

    setIsSending(true);
    try {
      const encodedMessage = encodeURIComponent(message.trim());
      const whatsappUrl = `https://wa.me/${cleanedNumber}?text=${encodedMessage}`;
      const newWindow = window.open(whatsappUrl, "_blank");
      if (!newWindow) {
        MySwal.fire({
          icon: "error",
          title: "Erro",
          html: '<p class="text-sm text-gray-700">Não foi possível abrir o WhatsApp. Verifique se o bloqueador de pop-ups está desativado ou se o WhatsApp está instalado.</p>',
          customClass: SWAL_CONFIG,
          confirmButtonText: "OK",
        });
        setIsSending(false);
        return;
      }
      setTimeout(() => {
        if (newWindow.closed) {
          const webUrl = `https://web.whatsapp.com/send?phone=${cleanedNumber}&text=${encodedMessage}`;
          window.open(webUrl, "_blank");
          MySwal.fire({
            icon: "info",
            title: "Tentando WhatsApp Web",
            html: '<p class="text-sm text-gray-700">Não foi possível abrir o aplicativo WhatsApp. Tentando abrir no WhatsApp Web.</p>',
            customClass: SWAL_CONFIG,
            confirmButtonText: "OK",
          });
        }
      }, 2000);
      setMessage("");
      MySwal.fire({
        icon: "success",
        title: "Mensagem Enviada!",
        html: '<p class="text-sm text-success">A conversa no WhatsApp foi iniciada.</p>',
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
    } catch (error: any) {
      console.error("[handleSendMessage] Error:", error);
      MySwal.fire({
        icon: "error",
        title: "Erro",
        html: '<p class="text-sm text-gray-700">Não foi possível abrir o WhatsApp. Verifique se o número está registrado no WhatsApp ou tente novamente.</p>',
        customClass: SWAL_CONFIG,
        confirmButtonText: "OK",
      });
    } finally {
      setIsSending(false);
    }
  }, [user, message, hasMatch, hasPremiumSubscription, viewedProfileData, router]);

  useEffect(() => {
    if (!userLoading && user && profile && profileId) {
      if (!hasLoadedProfileRef.current[profileId]) {
        loadProfile();
      }
    } else if (!userLoading && !user) {
      handleError(new Error("Você precisa estar logado para ver perfis."), "Não autenticado", router, ROUTES.LOGIN);
    }
  }, [userLoading, user, profile, profileId, loadProfile, router]);

  if (isLoading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E1E1E]" aria-hidden="true" />
        <span className="sr-only">Carregando perfil...</span>
      </div>
    );
  }

  if (!user || !profile || !viewedProfileData) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-700">
        <p>Não foi possível carregar o perfil ou você não está logado.</p>
      </div>
    );
  }

  return (
    <>
      {profile && <ProfileHeader name={profile.name} avatarUrl={profile.avatar_url} />}
      <div className="app-container flex flex-col min-h-screen px-4 py-6">
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-md mx-auto w-full"
        >
          <h2 className="text-2xl font-bold gradient-text text-center mb-6">
            Perfil de {viewedProfileData.name || "Usuário"}
          </h2>
          <div className="flex justify-between mb-6">
            {!isOwnProfile && !hasLiked && !hasMatch && (
              <Button
                onClick={handleLike}
                className="flex-1 mr-2 gradient-button"
                disabled={!canLikeToday}
                aria-label={canLikeToday ? "Curtir perfil" : "Você já curtiu este perfil hoje"}
              >
                <Heart className="h-4 w-4 mr-2" aria-hidden="true" />
                {canLikeToday ? "Curtir" : "Já Curtido Hoje"}
              </Button>
            )}
            <Button
              onClick={() => router.push(ROUTES.DISCOVER)}
              className="flex-1 ml-2 gradient-button"
              aria-label="Voltar para descoberta"
            >
              Voltar
            </Button>
          </div>
          {hasMatch && (
            <Badge className="bg-green-100 text-green-800 text-sm font-semibold flex items-center justify-center mb-6 py-2">
              <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
              É um Match! Conexão Cósmica!
              <Sparkles className="h-4 w-4 ml-2 animate-pulse" />
            </Badge>
          )}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
            <TabsList className="gradient-tabs grid grid-cols-2 w-full rounded-xl bg-white shadow-sm border border-gray-200">
              <TabsTrigger
                value="informacoes"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                aria-label="Ver informações do perfil"
              >
                Informações
              </TabsTrigger>
              <TabsTrigger
                value="fotos"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                aria-label="Ver fotos do perfil"
              >
                Fotos
              </TabsTrigger>
            </TabsList>
            <TabsContent value="informacoes">
              <ProfileInfo
                profileData={viewedProfileData}
                calculateAge={calculateAge}
                isOwnProfile={isOwnProfile}
                onUpdateInterests={handleUpdateInterests}
                compatibilityPercentage={compatibilityPercentage}
                dailyCard={hasPremiumSubscription && !isOwnProfile ? dailyCard : null}
              />
            </TabsContent>
            <TabsContent value="fotos">
              <ProfilePhotos photos={photos} />
            </TabsContent>
          </Tabs>
          {hasMatch && !hasPremiumSubscription && (
            <Card className="mb-6 border-none shadow-sm">
              <CardContent className="text-center py-4">
                <p className="text-oraculo-muted mb-4">
                  Faça um upgrade para Premium para enviar mensagens e desbloquear mais recursos!
                </p>
                <Button onClick={() => router.push(ROUTES.SUBSCRIPTION)} className="gradient-button">
                  Fazer Upgrade para Premium
                </Button>
              </CardContent>
            </Card>
          )}
          {!isOwnProfile && !hasMatch && !hasLiked && (
            <Card className="mb-6 border-none shadow-sm bg-blue-50/50 border border-blue-200">
              <CardContent className="text-center py-4">
                <p className="text-blue-800 font-medium">
                  Gostou do perfil de {viewedProfileData.name}?
                </p>
                <p className="text-blue-700 text-sm mt-1">
                  Mande uma curtida e espere a conexão cósmica acontecer!
                </p>
              </CardContent>
            </Card>
          )}
          {!isOwnProfile && hasLiked && !hasMatch && (
            <Card className="mb-6 border-none shadow-sm bg-yellow-50/50 border border-yellow-200">
              <CardContent className="text-center py-4">
                <p className="text-yellow-800 font-medium">
                  Sua curtida foi enviada!
                </p>
                <p className="text-yellow-700 text-sm mt-1">
                  Aguardando {viewedProfileData.name} te curtir de volta para darem match.
                </p>
              </CardContent>
            </Card>
          )}
          {!isOwnProfile && hasMatch && hasPremiumSubscription && (
            <Card className="mb-6 border-none shadow-sm bg-gray-50/50 border border-yellow-200">
              <CardContent className="text-center py-4">
                <div className="flex-1 mr-2">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Digite sua mensagem para o WhatsApp"
                    className="mb-2"
                    disabled={isSending}
                    aria-label="Digite sua mensagem para o WhatsApp"
                  />
                  <Button
                    onClick={handleSendMessage}
                    className="w-full gradient-button"
                    disabled={isSending}
                    aria-label="Enviar mensagem via WhatsApp"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <FaWhatsapp className="h-4 w-4 mr-2" aria-hidden="true" />
                        Enviar Mensagem
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.main>
      </div>
    </>
  );
}