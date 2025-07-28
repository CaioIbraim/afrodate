"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { Loader2, Heart, User2Icon, MapPin, ArrowRight, MessageSquare, Sparkles, X, Filter, EyeIcon } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ProfileHeader } from "@/components/profile-header";
import * as Dialog from "@radix-ui/react-dialog";

const MySwal = withReactContent(Swal);

// Types
interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  gender: string | null;
  latitude: number | null;
  longitude: number | null;
  distance?: number;
  isLiked: boolean;
  isMatch: boolean;
  whatsapp_number?: string | null;
  share_whatsapp?: boolean;
  age?: number | null;
}

interface UserPreferences {
  genderPreference: "HOMEM" | "MULHER" | "TODOS";
  minAge: number;
  maxAge: number;
  maxDistance: number;
}

// Haversine formula to calculate distance between two points (in kilometers)
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const showAlert = async (type: "success" | "error" | "info", title: string, text: string) => {
  return MySwal.fire({
    icon: type,
    title,
    text,
    customClass: {
      popup: "border-2 border-transparent bg-white rounded-2xl shadow-lg w-[90vw] max-w-sm",
      title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-xl font-bold",
      confirmButton: "bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-90",
    },
    willOpen: (popup) => {
      popup.setAttribute("aria-live", "assertive");
    },
  });
};

// Helper to manage viewed matches in localStorage
const getViewedMatches = (userId: string): Set<string> => {
  const viewed = localStorage.getItem(`viewed_matches_${userId}`);
  return viewed ? new Set(JSON.parse(viewed)) : new Set();
};

const markMatchAsViewed = (userId: string, profileId: string) => {
  const viewed = getViewedMatches(userId);
  viewed.add(profileId);
  localStorage.setItem(`viewed_matches_${userId}`, JSON.stringify([...viewed]));
};

// Helper to manage rejected profiles in localStorage
const getRejectedProfiles = (userId: string): Set<string> => {
  const rejected = localStorage.getItem(`rejected_profiles_${userId}`);
  return rejected ? new Set(JSON.parse(rejected)) : new Set();
};

const markProfileAsRejected = (userId: string, profileId: string) => {
  const rejected = getRejectedProfiles(userId);
  rejected.add(profileId);
  localStorage.setItem(`rejected_profiles_${userId}`, JSON.stringify([...rejected]));
};

// Helper to ensure full Supabase storage URL
const getFullAvatarUrl = (path: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `https://wthyagnvodxbvmxkjhzb.supabase.co/storage/v1/object/public/imagens/${path}`;
};

export default function ProximityPage() {
  const router = useRouter();
  const { user, profile, isLoading: userLoading } = useUser();
  const [nearbyProfiles, setNearbyProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<UserPreferences>({
    genderPreference: "TODOS",
    minAge: 18,
    maxAge: 50,
    maxDistance: 50,
  });
  const [interestTypes, setInterestTypes] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check premium status from profile.subscription
  const isPremiumUser = profile?.subscription && profile.subscription.is_active;

  // Fetch interest types
  const fetchInterestTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("interests")
        .select("type")
        .order("type", { ascending: true });

      if (error) {
        throw new Error("Erro ao carregar tipos de interesses: " + error.message);
      }

      const uniqueTypes = [...new Set(data?.map((item) => item.type) || [])];
      setInterestTypes(uniqueTypes);
    } catch (error: any) {
      console.error("Fetch interest types error:", error.message);
      await showAlert("error", "Erro", "Não foi possível carregar os tipos de interesses.");
    }
  }, []);

  // Handle WhatsApp button click with premium check
  const handleWhatsAppClick = async (profileId: string, name: string, whatsappNumber: string, isMatch: boolean) => {
    if (!user || !profile) {
      await showAlert("error", "Erro", "Usuário não autenticado.");
      return;
    }

    if (!isPremiumUser) {
      const result = await MySwal.fire({
        icon: "info",
        title: "Conta Premium Necessária",
        text: "Para enviar mensagens via WhatsApp, você precisa de uma conta premium.",
        showCancelButton: true,
        confirmButtonText: "Fazer Upgrade",
        cancelButtonText: "Cancelar",
        customClass: {
          popup: "border-2 border-transparent bg-white rounded-2xl shadow-lg w-[90vw] max-w-sm",
          title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-xl font-bold",
          confirmButton: "bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-90",
          cancelButton: "bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300",
        },
      });

      if (result.isConfirmed) {
        router.push("/subscription");
      }
      return;
    }

    if (isMatch && profile?.id) {
      markMatchAsViewed(profile.id, profileId);
    }

    window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`, '_blank', 'noopener,noreferrer');
  };

  // Fetch nearby profiles from API
  const fetchNearbyProfiles = useCallback(async () => {
    if (!user || !profile || userLoading) {
      if (!userLoading) {
        setIsLoading(false);
        await showAlert(
          "error",
          "Erro",
          "Usuário não autenticado. Por favor, faça login."
        );
        router.push("/login");
      }
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/nearby-profiles?userId=${profile.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar perfis próximos.');
      }

      const { profiles, preferences: fetchedPreferences } = data;

      if (!profile.latitude || !profile.longitude) {
        setNearbyProfiles([]);
        await showAlert(
          "error",
          "Localização Não Configurada",
          "Por favor, configure sua localização no perfil para encontrar pessoas próximas."
        );
        router.push("/profile");
        return;
      }

      setPreferences(fetchedPreferences);

      // Fetch rejected profiles from Supabase
      const { data: rejectedProfilesData, error: rejectedError } = await supabase
        .from("rejections")
        .select("rejected_profile_id")
        .eq("profile_id", profile.id);

      if (rejectedError) {
        throw new Error("Erro ao carregar perfis rejeitados: " + rejectedError.message);
      }

      const rejectedProfileIds = new Set(rejectedProfilesData?.map((item) => item.rejected_profile_id) || []);

      // Process profiles to add distance and ensure avatar URLs
      const viewedMatches = getViewedMatches(profile.id);
      const processedProfiles = profiles
        .map((p: Profile) => ({
          ...p,
          avatar_url: getFullAvatarUrl(p.avatar_url),
          distance: calculateDistance(
            profile.latitude!,
            profile.longitude!,
            p.latitude!,
            p.longitude!
          ),
        }))
        .filter((p: Profile) => 
          p.distance! <= fetchedPreferences.maxDistance && 
          (!p.isMatch || (p.isMatch && !viewedMatches.has(p.id))) &&
          !rejectedProfileIds.has(p.id)
        )
        .sort((a: Profile, b: Profile) => a.distance! - b.distance!)
        .slice(0, 3);

      setNearbyProfiles(processedProfiles);

      if (processedProfiles.length === 0) {
        await showAlert(
          "info",
          "Nenhum Perfil Encontrado",
          "Não encontramos pessoas dentro do raio especificado. Tente aumentar a distância ou ajustar suas preferências."
        );
      }
    } catch (error: any) {
      console.error("Error fetching nearby profiles:", error.message);
      await showAlert(
        "error",
        "Ooops!",
        error.message.includes('Localização') 
          ? error.message 
          : "Não foi possível carregar os perfis próximos. Por favor, entre em contato com o suporte."
      );
      setNearbyProfiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, profile, userLoading, router]);

  // Handle like action
  const handleLike = async (targetProfileId: string) => {
    if (!user || !profile) {
      await showAlert("error", "Erro", "Usuário não autenticado.");
      return;
    }

    try {
      // Insert like
      const { error: likeError } = await supabase
        .from("likes")
        .insert({ profile_id: profile.id, liked_profile_id: targetProfileId });

      if (likeError) {
        console.error("Error liking profile:", likeError.message);
        throw likeError;
      }

      // Check for mutual like (match)
      const { data: mutualLike, error: mutualLikeError } = await supabase
        .from("likes")
        .select("id")
        .eq("profile_id", targetProfileId)
        .eq("liked_profile_id", profile.id)
        .single();

      if (mutualLikeError && mutualLikeError.code !== "PGRST116") {
        console.error("Error checking mutual like:", mutualLikeError.message);
        throw mutualLikeError;
      }

      if (mutualLike) {
        // Create match
        const { error: matchError } = await supabase.from("matches").insert({
          profile1_id: profile.id < targetProfileId ? profile.id : targetProfileId,
          profile2_id: profile.id < targetProfileId ? targetProfileId : profile.id,
        });

        if (matchError) {
          console.error("Error creating match:", matchError.message);
          throw matchError;
        }

        await showAlert(
          "success",
          "Match!",
          "Parabéns! Você deu match com este perfil!"
        );
      } else {
        await showAlert("success", "Sucesso", "Você curtiu este perfil!");
      }

      // Refresh profiles
      await fetchNearbyProfiles();
    } catch (error: any) {
      await showAlert(
        "error",
        "Ooops!",
        "Não foi possível curtir o perfil. Por favor, entre em contato com o suporte."
      );
    }
  };

  // Handle reject action
  const handleReject = async (targetProfileId: string, name: string) => {
    if (!user || !profile) {
      await showAlert("error", "Erro", "Usuário não autenticado.");
      return;
    }

    try {
      // Insert rejection
      const { error: rejectError } = await supabase
        .from("rejections")
        .insert({ profile_id: profile.id, rejected_profile_id: targetProfileId });

      if (rejectError) {
        console.error("Error rejecting profile:", rejectError.message);
        throw rejectError;
      }

      // Mark profile as rejected in localStorage
      markProfileAsRejected(profile.id, targetProfileId);

      // Remove rejected profile from state
      setNearbyProfiles((prev) => prev.filter((p) => p.id !== targetProfileId));

      await showAlert("success", "Perfil Rejeitado", `Você rejeitou o perfil de ${name}.`);
      await fetchNearbyProfiles();
    } catch (error: any) {
      console.error("Reject error:", error.message);
      await showAlert(
        "error",
        "Ooops!",
        "Não foi possível rejeitar o perfil. Por favor, entre em contato com o suporte."
      );
    }
  };

  // Handle profile view to mark match as viewed
  const handleProfileInteraction = (profileId: string, isMatch: boolean) => {
    if (isMatch && profile?.id) {
      markMatchAsViewed(profile.id, profileId);
    }
  };

  useEffect(() => {
    fetchNearbyProfiles();
    fetchInterestTypes();
  }, [fetchNearbyProfiles, fetchInterestTypes]);

  if (userLoading || isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-[#00FFD1]" />
        <p className="text-oraculo-muted mt-3 text-base font-medium">Carregando perfis...</p>
      </div>
    );
  }

  if (!user || !profile) {
    if (!userLoading && !user) {
      router.push("/login");
      return null;
    }
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-6 ">
      <ProfileHeader name={profile.name} avatarUrl={profile.avatar_url} />

      <div className="w-full max-w-md mx-auto mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-center font-bold">
            Pessoas Próximas
          </h2>
          <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
            <Dialog.Trigger asChild>
              <Button
                variant="outline"
                className="text-[#00FFD1] border-[#00FFD1] hover:bg-[#00FFD1]/10 rounded-lg"
                aria-label="Filtrar interesses por tipo"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-lg p-6 w-[90vw] max-w-md">
                <Dialog.Title className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] mb-4">
                  Filtrar Interesses
                </Dialog.Title>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {interestTypes.map((type) => (
                    <Button
                      key={type}
                      variant="outline"
                      className="w-full text-left text-oraculo-dark hover:bg-[#00FFD1]/10"
                      onClick={() => {
                        router.push(`/interests?type=${encodeURIComponent(type)}`);
                        setIsModalOpen(false);
                      }}
                      aria-label={`Filtrar por ${type}`}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
                <Dialog.Close asChild>
                  <Button
                    variant="ghost"
                    className="mt-4 w-full text-oraculo-muted hover:text-oraculo-dark"
                    aria-label="Fechar modal"
                  >
                    Cancelar
                  </Button>
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

        {nearbyProfiles.length > 0 ? (
          <div className="space-y-6">
            {nearbyProfiles.map((nearbyProfile, index) => (
              <motion.div
                key={nearbyProfile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-row items-start gap-4 w-full relative">
                    {/* Avatar */}
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden flex-shrink-0 transition-transform hover:scale-105 focus:ring-2 focus:ring-[#00FFD1] focus:outline-none"
                      tabIndex={0}
                      aria-label={`Foto de perfil de ${nearbyProfile.name}`}
                    >
                      {nearbyProfile.avatar_url ? (
                        <Image
                          src={nearbyProfile.avatar_url}
                          alt={`Foto de perfil de ${nearbyProfile.name}`}
                          width={150}
                          height={150}
                          className="object-cover w-full h-full"
                          loading="lazy"
                          placeholder="blur"
                          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6ZAAAAABJRU5ErkJggg=="
                        />
                      ) : (
                        <Image
                          src={
                            nearbyProfile.gender === "MULHER"
                              ? index % 2 === 0
                                ? "/images/female-profile-1.png"
                                : "/images/female-profile.png"
                              : "/images/male-profile-1.png"
                          }
                          alt={`Foto de perfil padrão para ${nearbyProfile.name}`}
                          width={150}
                          height={150}
                          className="object-cover w-full h-full"
                          loading="lazy"
                          placeholder="blur"
                          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6ZAAAAABJRU5ErkJggg=="
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-1">
                      {/* Name and Badges */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <h3
                            className="text-oraculo-dark text-lg sm:text-xl font-bold line-clamp-1"
                            aria-describedby={`profile-status-${nearbyProfile.id}`}
                          >
                            {nearbyProfile.name}
                            <Badge
                              className="bg-[#00FFD1]/10 text-[#00FFD1] text-xs font-semibold flex items-center px-2 py-1 rounded-full min-w-[60px] ml-2"
                              tabIndex={0}
                            >
                              {nearbyProfile.age} anos
                            </Badge>
                          </h3>

                          <Badge
                            className="absolute top-0 right-0 bg-[#00FFD1]/10 text-[#00FFD1] text-xs font-semibold flex items-center px-2 py-1 rounded-full min-w-[60px]"
                            tabIndex={-1}
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            {nearbyProfile.distance?.toFixed(1)} km
                          </Badge>
                        </div>

                        {/* Status Badges */}
                        <div className="flex gap-1">
                          {nearbyProfile.isMatch ? (
                            <Badge
                              className="bg-[#00FFD1] text-white text-xs font-semibold flex items-center px-2 py-1 rounded-full min-w-[60px]"
                              tabIndex={-1}
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              Match!
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-2 mt-4 w-full justify-center items-center">
                          <Link
                            href={`/profile/${nearbyProfile.id}`}
                            className={nearbyProfile.isMatch && nearbyProfile.share_whatsapp && nearbyProfile.whatsapp_number ? "flex-1" : nearbyProfile.isMatch ? "flex-[2]" : "flex-1"}
                            onClick={() => handleProfileInteraction(nearbyProfile.id, nearbyProfile.isMatch)}
                          >
                            <Button
                              variant="outline"
                              className="flex-1 w-full text-[#00FFD1] border-[#00FFD1] hover:bg-[#00FFD1]/10 rounded-xl py-3 px-4 text-sm font-semibold transition-all duration-200 ease-in-out"
                              aria-label={`Ver perfil de ${nearbyProfile.name}`}
                            >
                              <EyeIcon className="h-5 w-5 mr-2" />
                              Ver Perfil
                            </Button>
                          </Link>
                          {!nearbyProfile.isMatch ? (
                            <>
                              <Button
                                className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white rounded-full text-sm font-semibold hover:opacity-90 transition-all duration-200 ease-in-out"
                                onClick={() => handleLike(nearbyProfile.id)}
                                aria-label={`Curtir ${nearbyProfile.name}`}
                              >
                                <Heart className="h-6 w-6" />
                              </Button>
                              <Button
                                className="flex items-center justify-center w-12 h-12 bg-red-500 text-white border-red-500 hover:bg-red-600 rounded-full text-sm font-semibold transition-all duration-200 ease-in-out"
                                onClick={() => handleReject(nearbyProfile.id, nearbyProfile.name)}
                                aria-label={`Rejeitar ${nearbyProfile.name}`}
                              >
                                <X className="h-6 w-6" />
                              </Button>
                            </>
                          ) : nearbyProfile.share_whatsapp && nearbyProfile.whatsapp_number ? (
                            <Button
                              className="flex-1 w-full bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white rounded-xl py-3 px-4 text-sm font-semibold hover:opacity-90 transition-all duration-200 ease-in-out"
                              onClick={() => handleWhatsAppClick(nearbyProfile.id, nearbyProfile.name, nearbyProfile.whatsapp_number!, nearbyProfile.isMatch)}
                              aria-label={`Enviar mensagem no WhatsApp para ${nearbyProfile.name}${!isPremiumUser ? " (requer conta premium)" : ""}`}
                            >
                              <MessageSquare className="h-5 w-5 mr-2" />
                              WhatsApp
                            </Button>
                          ) : null}
                        </div>
                      {/* Hidden Accessibility Description */}
                      <span
                        id={`profile-status-${nearbyProfile.id}`}
                        className="sr-only"
                      >
                        {nearbyProfile.isMatch
                          ? "Você deu match com este perfil"
                          : "Perfil disponível para curtir ou rejeitar"}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="p-6 text-center bg-white rounded-xl shadow-md"
          >
            <h3 className="text-lg sm:text-xl font-bold text-oraculo-dark mb-3">
              Ninguém por Perto
            </h3>
            <p className="text-oraculo-muted mb-4 text-sm sm:text-base">
              Não encontramos pessoas próximas no momento. Tente aumentar a distância ou ajustar suas preferências.
            </p>
            <Link href="/profile">
              <Button className="bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white rounded-lg py-2 px-4 text-sm font-medium hover:opacity-90">
                Ajustar Preferências
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}