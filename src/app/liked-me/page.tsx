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

interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  gender: string | null;
  latitude: number | null;
  longitude: number | null;
  birth_date?: string;
  distance?: number;
  isLiked: boolean;
  isMatch: boolean;
}

interface UserPreferences {
  genderPreference: "HOMEM" | "MULHER" | "TODOS";
  minAge: number;
  maxAge: number;
  maxDistance: number;
}

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
      popup: "border-2 border-transparent bg-white rounded-2xl shadow-xl w-[90vw] max-w-md",
      title: "text-2xl font-bold text-gray-800",
      confirmButton: "bg-gradient-to-r from-cyan-500 to-teal-400 text-white px-6 py-2 rounded-lg shadow-md hover:opacity-90 transition-opacity",
    },
    willOpen: (popup) => {
      popup.setAttribute("aria-live", "assertive");
    },
  });
};

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
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("gender_preference, min_age, max_age, max_distance")
        .eq("id", profile.id)
        .single();

      if (profileError) throw profileError;

      const userPrefs: UserPreferences = {
        genderPreference: profileData.gender_preference || "TODOS",
        minAge: profileData.min_age || 18,
        maxAge: profileData.max_age || 50,
        maxDistance: profileData.max_distance || 50,
      };
      setPreferences(userPrefs);

      const { data: incomingLikes, error: incomingLikesError } = await supabase
        .from("likes")
        .select("profile_id")
        .eq("liked_profile_id", profile.id);

      if (incomingLikesError) throw incomingLikesError;

      const { data: outgoingLikes, error: outgoingLikesError } = await supabase
        .from("likes")
        .select("liked_profile_id")
        .eq("profile_id", profile.id);

      if (outgoingLikesError) throw outgoingLikesError;

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("profile1_id, profile2_id")
        .or(`profile1_id.eq.${profile.id},profile2_id.eq.${profile.id}`);

      if (matchesError) throw matchesError;

      const matchedProfileIds = new Set(
        matchesData.flatMap((match) =>
          match.profile1_id === profile.id ? match.profile2_id : match.profile1_id
        )
      );

      const outgoingLikeIds = new Set(outgoingLikes.map((like) => like.liked_profile_id));
      const incomingLikeIds = new Set(incomingLikes.map((like) => like.profile_id));

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
      if (profilesError) throw profilesError;

      const viewedMatches = getViewedMatches(profile.id);

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
          } else if (isLikedByThem && !isLikedByMe && !isMatch) {
            filteredWhoLikedMe.push(profileEntry);
          } else if (isLikedByMe && !isMatch) {
            filteredWhoILiked.push(profileEntry);
          }
        });

      setWhoLikedMe(filteredWhoLikedMe.sort((a, b) => a.distance! - b.distance!));
      setWhoILiked(filteredWhoILiked.sort((a, b) => a.distance! - b.distance!));
      setMatches(filteredMatches.sort((a, b) => a.distance! - b.distance!));

      if (
        filteredWhoLikedMe.length === 0 &&
        filteredWhoILiked.length === 0 &&
        filteredMatches.length === 0
      ) {
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

  const handleLike = async (targetProfileId: string) => {
    if (!user || !profile) {
      await showAlert("error", "Erro", "Usuário não autenticado.");
      return;
    }

    try {
      const { error: likeError } = await supabase
        .from("likes")
        .insert({ profile_id: profile.id, liked_profile_id: targetProfileId });

      if (likeError) throw likeError;

      const { data: mutualLike, error: mutualLikeError } = await supabase
        .from("likes")
        .select("id")
        .eq("profile_id", targetProfileId)
        .eq("liked_profile_id", profile.id)
        .single();

      if (mutualLikeError && mutualLikeError.code !== "PGRST116") throw mutualLikeError;

      if (mutualLike) {
        const { error: matchError } = await supabase.from("matches").insert({
          profile1_id: profile.id < targetProfileId ? profile.id : targetProfileId,
          profile2_id: profile.id < targetProfileId ? targetProfileId : profile.id,
        });
        if (matchError) throw matchError;
        await showAlert("success", "Match!", "Parabéns! Você deu match com este perfil!");
      } else {
        await showAlert("success", "Sucesso", "Você curtiu este perfil!");
      }
      await fetchLikeAndMatchData();
    } catch (error: any) {
      await showAlert(
        "error",
        "Ooops!",
        "Não foi possível curtir o perfil. Tente novamente."
      );
    }
  };

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
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-200">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
        <p className="mt-4 text-lg font-medium text-gray-600">Carregando dados...</p>
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

  const renderProfileCard = (nearbyProfile: Profile, index: number, tab: string) => (
    <motion.div
      key={nearbyProfile.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100"
    >
      <div className="p-5 flex items-start gap-5">
        <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
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
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-800 mb-3 truncate">
            {nearbyProfile.name}
          </h3>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge className="bg-cyan-100 text-cyan-700 text-xs font-medium px-3 py-1 rounded-full flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              {nearbyProfile.distance?.toFixed(1)} km
            </Badge>
            {nearbyProfile.isMatch ? (
              <Badge className="bg-gradient-to-r from-cyan-500 to-teal-400 text-white text-xs font-medium px-3 py-1 rounded-full flex items-center">
                <Sparkles className="h-4 w-4 mr-1" />
                Match!
              </Badge>
            ) : nearbyProfile.isLiked ? (
              <Badge className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full flex items-center">
                Já Curtido
              </Badge>
            ) : null}
          </div>
          <div className="flex gap-3 w-full">
            <Link
              href={`/profile/${nearbyProfile.id}`}
              className="flex-1"
              onClick={() => handleProfileInteraction(nearbyProfile.id, nearbyProfile.isMatch)}
            >
              <Button
                variant="outline"
                className="w-full border-cyan-500 text-cyan-500 rounded-lg"
              >
                <User2Icon className="h-4 w-4 mr-2" />
                Ver Perfil
              </Button>
            </Link>


            {/* {nearbyProfile.isMatch ? (
              <Link
                href={`/chat/${nearbyProfile.id}`}
                className="flex-1"
                onClick={() => handleProfileInteraction(nearbyProfile.id, true)}
              >
                <Button
                  className="w-full bg-gradient-to-r from-cyan-500 to-teal-400 text-white hover:opacity-90 transition-opacity rounded-lg"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Conversar
                </Button>
              </Link>
            ) : tab === "Quem me curtiu" ? (
              <Button
                className="w-1/2 bg-gradient-to-r from-cyan-500 to-teal-400 text-white hover:opacity-90 transition-opacity rounded-lg"
                onClick={() => handleLike(nearbyProfile.id)}
              >
                <Heart className="h-4 w-4 mr-2" />
                Curtir
              </Button>
            ) : null} */}



          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-200">
      <ProfileHeader name={profile!.name} avatarUrl={profile!.avatar_url} />
      <div className="max-w-4xl mx-auto w-full py-10 px-4 sm:px-6">
        <TabGroup>
          <TabList className="flex gap-4 mb-8 bg-white p-2 rounded-xl shadow-sm">
            <Tab className={({ selected }) =>
              `flex-1 px-4 py-3 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                selected
                  ? "bg-gradient-to-r from-cyan-500 to-teal-400 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`
            }>
              Quem me curtiu
            </Tab>
            <Tab className={({ selected }) =>
              `flex-1 px-4 py-3 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                selected
                  ? "bg-gradient-to-r from-cyan-500 to-teal-400 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`
            }>
              Quem eu curti
            </Tab>
            <Tab className={({ selected }) =>
              `flex-1 px-4 py-3 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                selected
                  ? "bg-gradient-to-r from-cyan-500 to-teal-400 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`
            }>
              Matches
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <div className="grid gap-6">
                {whoLikedMe.length === 0 ? (
                  <div className="text-center py-10 text-gray-600 text-lg font-medium bg-white rounded-xl shadow-sm">
                    Nenhum perfil te curtiu ainda.
                  </div>
                ) : (
                  whoLikedMe.map((profile, idx) => renderProfileCard(profile, idx, "Quem me curtiu"))
                )}
              </div>
            </TabPanel>
            <TabPanel>
              <div className="grid gap-6">
                {whoILiked.length === 0 ? (
                  <div className="text-center py-10 text-gray-600 text-lg font-medium bg-white rounded-xl shadow-sm">
                    Você ainda não curtiu ninguém.
                  </div>
                ) : (
                  whoILiked.map((profile, idx) => renderProfileCard(profile, idx, "Quem eu curti"))
                )}
              </div>
            </TabPanel>
            <TabPanel>
              <div className="grid gap-6">
                {matches.length === 0 ? (
                  <div className="text-center py-10 text-gray-600 text-lg font-medium bg-white rounded-xl shadow-sm">
                    Nenhum match novo por aqui.
                  </div>
                ) : (
                  matches.map((profile, idx) => renderProfileCard(profile, idx, "Matches"))
                )}
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </div>
  );
}