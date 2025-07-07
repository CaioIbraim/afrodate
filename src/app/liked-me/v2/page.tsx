"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { Loader2, Heart, User2Icon, MapPin, MessageCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ProfileHeader } from "@/components/profile-header";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";

const MySwal = withReactContent(Swal);

// Types
interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  gender: string | null;
  latitude: number | null;
  longitude: number | null;
  birth_date?: string;
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

export default function MatchesPage() {
  const router = useRouter();
  const { user, profile, isLoading: userLoading } = useUser();
  const [whoLikedMe, setWhoLikedMe] = useState<Profile[]>([]);
  const [whoILiked, setWhoILiked] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Profile[]>([]);
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

    // Ajuste correto: apenas decrementa a idade, não retorna null aqui
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 18 ? age : null;
  }, []);

  // Fetch all like and match data
  const fetchLikeAndMatchData = useCallback(async () => {
    if (!user || !profile || userLoading || !profile.latitude || !profile.longitude) {
      if (!userLoading) {
        setIsLoading(false);
        if (!profile?.latitude || !profile?.longitude) {
          await showAlert(
            "error",
            "Localização Não Configurada",
            "Por favor, configure sua localização no perfil para ver curtidas e matches."
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

      // Fetch profiles who liked the user
      const { data: incomingLikes, error: incomingLikesError } = await supabase
        .from("likes")
        .select("profile_id")
        .eq("liked_profile_id", profile.id);

      if (incomingLikesError) {
        console.log("Error fetching incoming likes:", incomingLikesError.message);
        throw incomingLikesError;
      }

      // Fetch profiles the user liked
      const { data: outgoingLikes, error: outgoingLikesError } = await supabase
        .from("likes")
        .select("liked_profile_id")
        .eq("profile_id", profile.id);

      if (outgoingLikesError) {
        console.log("Error fetching outgoing likes:", outgoingLikesError.message);
        throw outgoingLikesError;
      }

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

      const outgoingLikeIds = new Set(outgoingLikes.map((like) => like.liked_profile_id));
      const incomingLikeIds = new Set(incomingLikes.map((like) => like.profile_id));

      // Fetch profile details for relevant users
      const profileIdsToFetch = new Set([
        ...incomingLikeIds,
        ...outgoingLikeIds,
        ...matchedProfileIds,
      ]);

      let query = supabase
        .from("profiles")
        .select("id, name, avatar_url, gender, latitude, longitude, birth_date")
        .in("id", [...profileIdsToFetch])
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (userPrefs.genderPreference !== "TODOS") {
        query = query.eq("gender", userPrefs.genderPreference);
      }

      const { data: profilesData, error: profilesError } = await query;

      if (profilesError) {
        console.log("Error fetching profiles:", profilesError.message);
        throw profilesError;
      }

      // Get viewed matches
      const viewedMatches = getViewedMatches(profile.id);

      // Process profiles
      const filteredWhoLikedMe: Profile[] = [];
      const filteredWhoILiked: Profile[] = [];
      const filteredMatches: Profile[] = [];

      profilesData
        .filter((p) => {
          const age = calculateAge(p.birth_date);
          return (
            age !== null &&
            age >= userPrefs.minAge &&
            age <= userPrefs.maxAge &&
            p.latitude !== null &&
            p.longitude !== null
          );
        })
        .forEach((p) => {
          const distance = calculateDistance(
            profile.latitude!,
            profile.longitude!,
            p.latitude!,
            p.longitude!
          );
          if (distance > userPrefs.maxDistance) return;

          const isMatch = matchedProfileIds.has(p.id);
          const isLikedByMe = outgoingLikeIds.has(p.id);
          const isLikedByThem = incomingLikeIds.has(p.id);

          const profileEntry: Profile = {
            ...p,
            distance,
            isLiked: isLikedByMe,
            isMatch,
          };

          if (isMatch && !viewedMatches.has(p.id)) {
            filteredMatches.push(profileEntry);
          } else if (isLikedByThem && !isMatch) {
            filteredWhoLikedMe.push(profileEntry);
          } else if (isLikedByMe && !isMatch) {
            filteredWhoILiked.push(profileEntry);
          }
        });

      setWhoLikedMe(filteredWhoLikedMe.sort((a, b) => a.distance! - b.distance!));
      setWhoILiked(filteredWhoILiked.sort((a, b) => a.distance! - b.distance!));
      setMatches(filteredMatches.sort((a, b) => a.distance! - b.distance!));

      if (filteredWhoLikedMe.length === 0 && filteredWhoILiked.length === 0 && filteredMatches.length === 0) {
        await showAlert(
          "info",
          "Nenhuma Atividade",
          "Ainda não há curtidas ou matches. Explore mais perfis!"
        );
      }
    } catch (error: any) {
      await showAlert(
        "error",
        "Ooops!",
        "Não foi possível carregar as curtidas e matches. Tente novamente."
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
        throw mutualLikeError;
      }

      if (mutualLike) {
        // Create match
        const { error: matchError } = await supabase.from("matches").insert({
          profile1_id: profile.id < targetProfileId ? profile.id : targetProfileId,
          profile2_id: profile.id < targetProfileId ? targetProfileId : profile.id,
        });

        if (matchError) {
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

      // Refresh data
      await fetchLikeAndMatchData();
    } catch (error: any) {
      await showAlert(
        "error",
        "Ooops!",
        "Não foi possível curtir o perfil. Tente novamente."
      );
    }
  };

  // Handle profile view or message click to mark profile as viewed
  const handleProfileInteraction = (profileId: string, isMatch: boolean) => {
    if (isMatch && profile?.id) {
      markMatchAsViewed(profile.id, profileId);
    }
  };

  useEffect(() => {
    fetchLikeAndMatchData();
  }, [fetchLikeAndMatchData]);

  if (userLoading || isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-[#00FFD1]" />
        <p className="text-oraculo-muted mt-3 text-base font-medium">Carregando dados...</p>
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

  const renderProfileCard = (nearbyProfile: Profile, index: number) => (
    <motion.div
      key={nearbyProfile.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300"
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start gap-4">
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
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between mb-3">
              <h3 className="text-oraculo-dark text-lg sm:text-xl font-bold truncate max-w-[80%]">
                {nearbyProfile.name}
              </h3>
              <div className="flex gap-2 mt-2 sm:mt-0">
                <Badge className="bg-[#00FFD1]/10 text-[#00FFD1] text-xs font-medium flex items-center px-2 py-1 rounded-full">
                  <MapPin className="h-3 w-3 mr-1" />
                  {nearbyProfile.distance?.toFixed(1)} km
                </Badge>
                {nearbyProfile.isMatch ? (
                  <Badge className="bg-[#00FFD1] text-white text-xs font-medium flex items-center px-2 py-1 rounded-full">
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
            <div className="flex gap-2 mt-3">
              <Link
                href={`/profile/${nearbyProfile.id}`}
                className="flex-1"
                onClick={() => handleProfileInteraction(nearbyProfile.id, nearbyProfile.isMatch)}
              >
                <Button
                  variant="outline"
                  className="w-full text-[#00FFD1] border-[#00FFD1]"
                >
                  <User2Icon className="h-4 w-4 mr-2" />
                  Ver Perfil
                </Button>
              </Link>
              {nearbyProfile.isMatch ? (
                <Link
                  href={`/chat/${nearbyProfile.id}`}
                  className="flex-1"
                  onClick={() => handleProfileInteraction(nearbyProfile.id, true)}
                >
                  <Button
                   
                    className="w-full flex items-center"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Conversar
                  </Button>
                </Link>
              ) : !nearbyProfile.isLiked ? (
                <Button
                  className="flex-1 flex items-center"
                  onClick={() => handleLike(nearbyProfile.id)}
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Curtir
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-3xl mx-auto w-full py-8 px-3">
      <ProfileHeader name={profile!.name} avatarUrl={profile!.avatar_url} />

      <TabGroup>
        <TabList className="flex gap-3 mb-6">
          <Tab className={({ selected }) =>
            `px-4 py-2 rounded-lg font-semibold transition ${
              selected
                ? "bg-[#00FFD1] text-white"
                : "bg-gray-100 text-oraculo-dark hover:bg-gray-200"
            }`
          }>
            Quem me curtiu
          </Tab>
          <Tab className={({ selected }) =>
            `px-4 py-2 rounded-lg font-semibold transition ${
              selected
                ? "bg-oraculo-cyan text-white"
                : "bg-gray-100 text-oraculo-dark hover:bg-gray-200"
            }`
          }>
            Quem eu curti
          </Tab>
          <Tab className={({ selected }) =>
            `px-4 py-2 rounded-lg font-semibold transition ${
              selected
                ? "bg-[#00FFD1] bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white"
                : "bg-gray-100 text-oraculo-dark hover:bg-gray-200"
            }`
          }>
            Matches
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <div className="grid gap-6">
              {whoLikedMe.length === 0 ? (
                <div className="text-center text-oraculo-muted">Nenhum perfil te curtiu ainda.</div>
              ) : (
                whoLikedMe.map(renderProfileCard)
              )}
            </div>
          </TabPanel>
          <TabPanel>
            <div className="grid gap-6">
              {whoILiked.length === 0 ? (
                <div className="text-center text-oraculo-muted">Você ainda não curtiu ninguém.</div>
              ) : (
                whoILiked.map(renderProfileCard)
              )}
            </div>
          </TabPanel>
          <TabPanel>
            <div className="grid gap-6">
              {matches.length === 0 ? (
                <div className="text-center text-oraculo-muted">Nenhum match novo por aqui.</div>
              ) : (
                matches.map(renderProfileCard)
              )}
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
