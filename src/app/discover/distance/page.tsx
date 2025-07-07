"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { Loader2, Heart, User2Icon, MapPin, ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
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

const showAlert = async (type: "success" | "error", title: string, text: string) => {
  return MySwal.fire({
    icon: type,
    title,
    text,
    customClass: {
      popup: "border-2 border-transparent bg-white rounded-xl",
      title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-xl font-bold",
      confirmButton: "bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white px-4 py-2 rounded shadow",
    },
    willOpen: (popup) => {
      popup.setAttribute("aria-live", "assertive");
    },
  });
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

      setPreferences({
        genderPreference: profileData.gender_preference || "TODOS",
        minAge: profileData.min_age || 18,
        maxAge: profileData.max_age || 50,
        maxDistance: profileData.max_distance || 50,
      });

      // Fetch profiles with location data
      let query = supabase
        .from("profiles")
        .select("id, name, avatar_url, gender, latitude, longitude, birth_date")
        .neq("id", profile.id) // Exclude current user
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      // Apply gender preference filter
      if (profileData.gender_preference !== "TODOS") {
        query = query.eq("gender", profileData.gender_preference);
      }

      const { data: profilesData, error: profilesError } = await query;

      if (profilesError) {
        console.log("Error fetching profiles:", profilesError.message);
        throw profilesError;
      }

      // Filter profiles by age and distance
      const filteredProfiles = profilesData
        .filter((p) => {
          const age = calculateAge(p.birth_date);
          return (
            age !== null &&
            age >= profileData.min_age &&
            age <= profileData.max_age &&
            p.latitude !== null &&
            p.longitude !== null
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
        }))
        .filter((p) => p.distance! <= profileData.max_distance)
        .sort((a, b) => a.distance! - b.distance!) // Sort by distance (closest first)
        .slice(0, 3); // Limit to 3 profiles

      setNearbyProfiles(filteredProfiles);
      console.log("Nearby profiles loaded:", filteredProfiles);

      if (filteredProfiles.length === 0) {
        await showAlert(
          "error",
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
      // Check if like already exists
      const { data: existingLike, error: likeCheckError } = await supabase
        .from("likes")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("liked_profile_id", targetProfileId)
        .single();

      if (likeCheckError && likeCheckError.code !== "PGRST116") {
        console.log("Error checking existing like:", likeCheckError.message);
        throw likeCheckError;
      }

      if (existingLike) {
        await showAlert("success", "Já Curtido", "Você já curtiu este perfil.");
        return;
      }

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

      // Refresh profiles to reflect any new matches
      await fetchNearbyProfiles();
    } catch (error: any) {
      await showAlert(
        "error",
        "Ooops!",
        "Não foi possível curtir o perfil. Tente novamente."
      );
    }
  };

  useEffect(() => {
    fetchNearbyProfiles();
  }, [fetchNearbyProfiles]);

  if (userLoading || isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#00FFD1]" />
        <p className="text-oraculo-muted mt-4">Carregando perfis...</p>
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
    <div className="flex flex-col min-h-screen bg-gray-50 px-4 py-6">
      <ProfileHeader name={profile.name} avatarUrl={profile.avatar_url} />

      <div className="max-w-md mx-auto w-full">
        <h2 className="text-xl text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] mb-8 text-center font-semibold">
          Pessoas Próximas
        </h2>

        {nearbyProfiles.length > 0 ? (
          <div className="space-y-6">
            {nearbyProfiles.map((nearbyProfile, index) => (
              <motion.div
                key={nearbyProfile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="flex flex-col p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-32 rounded-lg overflow-hidden">
                      {nearbyProfile.avatar_url ? (
                        <Image
                          src={nearbyProfile.avatar_url}
                          alt={`Foto de ${nearbyProfile.name}`}
                          width={200}
                          height={300}
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
                          width={200}
                          height={300}
                          className="object-cover w-full h-full"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-oraculo-dark text-xl">{nearbyProfile.name}</h3>
                        <Badge className="bg-[#00FFD1]/10 text-[#00FFD1] text-xs flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {nearbyProfile.distance?.toFixed(1)} km
                        </Badge>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Link href={`/profile/${nearbyProfile.id}`}>
                          <Button
                            variant="outline"
                            className="flex-1 text-[#00FFD1] border-[#00FFD1]"
                          >
                            <User2Icon className="h-4 w-4 mr-2" />
                            Ver Perfil
                          </Button>
                        </Link>
                        <Button
                          className="flex-1 bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white"
                          onClick={() => handleLike(nearbyProfile.id)}
                        >
                          <Heart className="h-4 w-4 mr-2" />
                          Curtir
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-white rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-oraculo-dark mb-4">
              Ninguém por Perto
            </h3>
            <p className="text-oraculo-muted mb-6">
              Não encontramos pessoas próximas no momento. Tente aumentar a distância máxima nas suas preferências.
            </p>
            <Link href="/profile">
              <Button className="bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white">
                Ajustar Preferências
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}