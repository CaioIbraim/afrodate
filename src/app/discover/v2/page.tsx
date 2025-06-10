"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { Loader2, Heart, User2Icon, MapPin, ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ProfileHeader } from "@/components/profile-header";

const MySwal = withReactContent(Swal);

// Types
interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  gender: string | null;
  latitude: number | null;
  longitude: number | null;
  distance?: number; // Calculated distance in kilometers
  isLiked: boolean; // Whether the user has liked this profile
  isMatch: boolean; // Whether this is a mutual match
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
  const R = 6371; // Earth's radius in kilometers
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
      title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
      confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-6 py-2 rounded-lg shadow-md hover:opacity-90",
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

  // Calculate age from birth_date
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

  // Fetch nearby profiles
  const fetchNearbyProfiles = useCallback(async () => {
    if (!user || !profile || userLoading || !profile.latitude || !profile.longitude) {
      if (!userLoading) {
        setIsLoading(false);
        if (!profile?.latitude || !profile?.longitude) {
          await showAlert(
            "error",
            "Localização Não Configurada",
            "Por favor, configure sua localização no perfil para encontrar pessoas próximas."
          );
          router.push("/profile");
        }
        return;
      }
      return;
    }

    setIsLoading(true);
    try {
      // Fetch user preferences
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("gender_preference, min_age, max_age, max_distance")
        .eq("id", profile.id)
        .single();

      if (profileError) {
        console.log("Error fetching preferences:", profileError.message);
        throw profileError;
      }

      const userPrefs: UserPreferences = {
        genderPreference: profileData.gender_preference || "TODOS",
        minAge: profileData.min_age || 18,
        maxAge: profileData.max_age || 50,
        maxDistance: profileData.max_distance || 50,
      };
      setPreferences(userPrefs);

      // Fetch profiles with location data
      let query = supabase
        .from("profiles")
        .select("id, name, avatar_url, gender, latitude, longitude, birth_date")
        .neq("id", profile.id) // Exclude current user
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      // Apply gender preference filter
      if (userPrefs.genderPreference !== "TODOS") {
        query = query.eq("gender", userPrefs.genderPreference);
      }

      const { data: profilesData, error: profilesError } = await query;

      if (profilesError) {
        console.log("Error fetching profiles:", profilesError.message);
        throw profilesError;
      }

      // Fetch user's existing likes
      const { data: userLikes, error: likesError } = await supabase
        .from("likes")
        .select("liked_profile_id")
        .eq("profile_id", profile.id);

      if (likesError) {
        console.log("Error fetching user likes:", likesError.message);
        throw likesError;
      }

      const likedProfileIds = new Set(userLikes.map((like) => like.liked_profile_id));

      // Fetch mutual matches
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("profile1_id, profile2_id")
        .or(`profile1_id.eq.${profile.id},profile2_id.eq.${profile.id}`);

      if (matchesError) {
        console.log("Error fetching matches:", matchesError.message);
        throw matchesError;
      }

      const matchedProfileIds = new Set(
        matchesData.flatMap((match) =>
          match.profile1_id === profile.id ? match.profile2_id : match.profile1_id
        )
      );

      // Get viewed matches
      const viewedMatches = getViewedMatches(profile.id);

      // Filter profiles by age, distance, and add like/match status
      const filteredProfiles = profilesData
        .filter((p) => {
          const age = calculateAge(p.birth_date);
          const isMatch = matchedProfileIds.has(p.id);
          // Exclude matched profiles that have been viewed
          return (
            age !== null &&
            age >= userPrefs.minAge &&
            age <= userPrefs.maxAge &&
            p.latitude !== null &&
            p.longitude !== null &&
            (!isMatch || (isMatch && !viewedMatches.has(p.id)))
          );
        })
        .map((p) => ({
          ...p,
          distance: calculateDistance(
            profile.latitude!,
            profile.longitude!,
            p.latitude!,
            p.longitude!
          ),
          isLiked: likedProfileIds.has(p.id),
          isMatch: matchedProfileIds.has(p.id),
        }))
        .filter((p) => p.distance! <= userPrefs.maxDistance)
        .sort((a, b) => a.distance! - b.distance!) // Sort by distance (ascending)
        .slice(0, 3); // Limit to 3 profiles

      setNearbyProfiles(filteredProfiles);
      console.log("Nearby profiles loaded:", filteredProfiles);

      if (filteredProfiles.length === 0) {
        await showAlert(
          "info",
          "Nenhum Perfil Encontrado",
          "Não encontramos pessoas dentro do raio especificado. Tente aumentar a distância máxima ou ajustar suas preferências."
        );
      }
    } catch (error: any) {
      console.log("Error fetching nearby profiles:", error.message);
      await showAlert(
        "error",
        "Ooops!",
        "Não foi possível carregar os perfis próximos. Tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  }, [user, profile, userLoading, calculateAge, router]);

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
        console.log("Error liking profile:", likeError.message);
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
        console.log("Error checking mutual like:", mutualLikeError.message);
        throw mutualLikeError;
      }

      if (mutualLike) {
        // Create match
        const { error: matchError } = await supabase.from("matches").insert({
          profile1_id: profile.id < targetProfileId ? profile.id : targetProfileId,
          profile2_id: profile.id < targetProfileId ? targetProfileId : profile.id,
        });

        if (matchError) {
          console.log("Error creating match:", matchError.message);
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

      // Refresh profiles to reflect new like/match status
      await fetchNearbyProfiles();
    } catch (error: any) {
      await showAlert(
        "error",
        "Ooops!",
        "Não foi possível curtir o perfil. Tente novamente."
      );
    }
  };

  // Handle profile view or message click to mark match as viewed
  const handleProfileInteraction = (profileId: string, isMatch: boolean) => {
    if (isMatch && profile?.id) {
      markMatchAsViewed(profile.id, profileId);
    }
  };

  useEffect(() => {
    fetchNearbyProfiles();
  }, [fetchNearbyProfiles]);

  if (userLoading || isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-oraculo-purple" />
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
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-6">
      <ProfileHeader name={profile.name} avatarUrl={profile.avatar_url} />

      <div className="w-full max-w-md mx-auto">
        <h2 className="text-xl sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan mb-8 text-center font-bold">
          Pessoas Próximas
        </h2>

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
                  <div className="flex flex-col sm:flex-row items-start gap-4">


                    <div className="flex flex-row justify-between gap-2 w-full sm:w-auto">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden flex-shrink-0">
                        {nearbyProfile.avatar_url ? (
                            <Image
                            src={nearbyProfile.avatar_url}
                            alt={`Foto de ${nearbyProfile.name}`}
                            width={150}
                            height={150}
                            className="object-cover w-full h-full"
                            loading="lazy"
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
                            alt={`Foto de ${nearbyProfile.name}`}
                            width={150}
                            height={150}
                            className="object-cover w-full h-full"
                            loading="lazy"
                            />
                        )}
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between mb-3">
                            <h3 className="text-oraculo-dark text-lg sm:text-xl font-bold truncate max-w-[80%]">
                            {nearbyProfile.name}
                            </h3>

                            <div className="flex gap-2 mt-2 sm:mt-0">
                            <Badge className="bg-oraculo-purple/10 text-oraculo-purple text-xs font-medium flex items-center px-2 py-1 rounded-full">
                                <MapPin className="h-3 w-3 mr-1" />
                                {nearbyProfile.distance?.toFixed(1)} km
                            </Badge>
                            {nearbyProfile.isMatch ? (
                                <Badge className="bg-oraculo-purple text-white text-xs font-medium flex items-center px-2 py-1 rounded-full">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Match!
                                </Badge>
                            ) : nearbyProfile.isLiked ? (
                                <Badge className="bg-oraculo-cyan/20 text-oraculo-cyan text-xs font-medium flex items-center px-2 py-1 rounded-full">
                                Já Curtido
                                </Badge>
                            ) : null}
                            </div>

                        
                        </div>
                    </div>


                    <div className="flex-1 w-full">
                      
                      
                      <div className="flex gap-2 mt-3">
                        <Link
                          href={`/profile/${nearbyProfile.id}`}
                          className="flex-1"
                          onClick={() => handleProfileInteraction(nearbyProfile.id, nearbyProfile.isMatch)}
                        >
                          <Button
                            variant="outline"
                            className="w-full text-oraculo-purple border-oraculo-purple hover:bg-oraculo-purple/10 rounded-lg py-5 text-xs sm:text-sm font-medium"
                            aria-label={`Ver perfil de ${nearbyProfile.name}`}
                          >
                            <User2Icon className="h-4 w-4 mr-1 sm:mr-2" />
                            Ver Perfil
                          </Button>
                        </Link>
                        {nearbyProfile.isMatch ? (
                          <Link
                            href={`/chat/${nearbyProfile.id}`}
                            className="flex-1"
                            onClick={() => handleProfileInteraction(nearbyProfile.id, nearbyProfile.isMatch)}
                          >
                            <Button
                              className="w-full bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white rounded-lg py-5 text-xs sm:text-sm font-medium hover:opacity-90"
                              aria-label={`Enviar mensagem para ${nearbyProfile.name}`}
                            >
                              <MessageCircle className="h-4 w-4 mr-1 sm:mr-2" />
                              Mensagem
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            className="flex-1 w-full bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white rounded-lg py-5 text-xs sm:text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleLike(nearbyProfile.id)}
                            disabled={nearbyProfile.isLiked || nearbyProfile.isMatch}
                            aria-label={
                              nearbyProfile.isLiked
                                ? `Já curtiu ${nearbyProfile.name}`
                                : `Curtir ${nearbyProfile.name}`
                            }
                          >
                            <Heart className="h-4 w-4 mr-1 sm:mr-2" />
                            {nearbyProfile.isLiked ? "Já Curtido" : "Curtir"}
                          </Button>
                        )}
                      </div>
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
              Não encontramos pessoas próximas no momento. Tente aumentar a distância máxima nas suas preferências.
            </p>
            <Link href="/profile">
              <Button className="bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white rounded-lg py-2 px-4 text-sm font-medium hover:opacity-90">
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