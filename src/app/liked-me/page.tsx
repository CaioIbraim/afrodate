"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { Loader2, Heart, User2Icon, MessageCircle, Sparkles, MapPin, Lock } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ProfileHeader } from "@/components/profile-header";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { MobileFooterMenu } from "@/components/MobileFooterMenu";

const MySwal = withReactContent(Swal);

// Tipos de dados
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

const showAlert = async (type: "success" | "error" | "info", title: string, text: string) => {
  return MySwal.fire({
    icon: type,
    title,
    text,
    customClass: {
      popup: "border-2 border-transparent bg-white rounded-2xl shadow-xl w-[90vw] max-w-md",
      title: "text-xl sm:text-2xl font-bold text-gray-800",
      confirmButton: "bg-gradient-to-r from-cyan-500 to-teal-400 text-white px-4 sm:px-6 py-2 rounded-lg shadow-md hover:opacity-90 transition-opacity",
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

const ProfileCardComponent = ({
  profile: nearbyProfile,
  index,
  tab,
  handleLike,
  handleProfileInteraction,
  hasPremiumSubscription,
}: {
  profile: Profile;
  index: number;
  tab: string;
  handleLike: (id: string) => Promise<void>;
  handleProfileInteraction: (id: string, isMatch: boolean) => void;
  hasPremiumSubscription: boolean;
}) => {
  const router = useRouter();
  const isWhoLikedMeTab = tab === "Quem me curtiu";
  const isRestricted = isWhoLikedMeTab && !hasPremiumSubscription;

  return (
    <motion.div
      key={nearbyProfile.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 w-full max-w-[400px] mx-auto"
    >
      <div className="p-4 flex flex-row items-start gap-4">
        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative">
          <Image
            src={nearbyProfile.avatar_url || (nearbyProfile.gender === "MULHER" ? "/images/female-profile.png" : "/images/male-profile-1.png")}
            alt={`Foto de ${nearbyProfile.name}`}
            width={150}
            height={150}
            className={`object-cover w-full h-full ${isRestricted ? "filter blur-md" : ""}`}
            loading="lazy"
          />
          {isRestricted && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Lock className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-semibold text-gray-800 truncate ${isRestricted ? "filter blur-sm" : ""}`}>
              {isRestricted ? "Nome oculto" : nearbyProfile.name}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 mb-3">
            {nearbyProfile.distance && (
              <Badge className="bg-cyan-100 text-cyan-700 text-xs font-medium px-2 py-1 rounded-full flex items-center">
                <MapPin className="h-3.5 w-3.5 mr-1" />
                {nearbyProfile.distance.toFixed(1)} km
              </Badge>
            )}
            {tab === "Matches" && (
              <Badge className="bg-gradient-to-r from-cyan-500 to-teal-400 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center">
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Match!
              </Badge>
            )}
            {tab === "Quem eu curti" && (
              <Badge className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-1 rounded-full flex items-center">
                Aguardando
              </Badge>
            )}
            {isWhoLikedMeTab && (
              <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center">
                <Heart className="h-3.5 w-3.5 mr-1" />
                Te Curtiu
              </Badge>
            )}
            {isRestricted && (
              <Badge className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-1 rounded-full flex items-center">
                <Lock className="h-3.5 w-3.5 mr-1" />
                Premium necessário
              </Badge>
            )}
          </div>
          <div className="flex flex-row gap-2">
            {!isRestricted && (
              <Link
                href={`/profile/${nearbyProfile.id}`}
                className="flex-1"
                onClick={() => handleProfileInteraction(nearbyProfile.id, !!nearbyProfile.isMatch)}
              >
                <Button
                  variant="outline"
                  className="w-full border-cyan-500 text-cyan-500 rounded-lg text-sm"
                >
                  <User2Icon className="h-4 w-4 mr-2" />
                  Ver Perfil
                </Button>
              </Link>
            )}
            {isWhoLikedMeTab && hasPremiumSubscription && (
              <Button
                className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-400 text-white hover:opacity-90 transition-opacity rounded-lg text-sm"
                onClick={() => handleLike(nearbyProfile.id)}
              >
                <Heart className="h-4 w-4 mr-2" />
                Curtir
              </Button>
            )}
            {isRestricted && (
              <Button
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-400 text-white hover:opacity-90 transition-opacity rounded-lg text-sm"
                onClick={() => router.push("/subscriptions")}
              >
                <Lock className="h-4 w-4 mr-2" />
                Fazer Upgrade
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function MatchesPage() {
  const router = useRouter();
  const { user, profile, isLoading: userLoading } = useUser();
  const [whoLikedMe, setWhoLikedMe] = useState<Profile[]>([]);
  const [whoILiked, setWhoILiked] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const hasPremiumSubscription = useMemo(() => !!profile?.subscription, [profile]);

  const fetchLikeAndMatchData = useCallback(async () => {
    if (userLoading || !user || !profile) {
      if (!userLoading) {
        setIsLoading(false);
        router.push("/login");
      }
      return;
    }

    setIsLoading(true);
    try {
      const { data: incomingLikes, error: incomingLikesError } = await supabase
        .from("likes")
        .select("profile_id")
        .eq("liked_profile_id", profile.id);
      if (incomingLikesError) throw incomingLikesError;
      const incomingLikeIds = incomingLikes.map((like) => like.profile_id);

      const { data: outgoingLikes, error: outgoingLikesError } = await supabase
        .from("likes")
        .select("liked_profile_id")
        .eq("profile_id", profile.id);
      if (outgoingLikesError) throw outgoingLikesError;
      const outgoingLikeIds = outgoingLikes.map((like) => like.liked_profile_id);

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("profile1_id, profile2_id")
        .or(`profile1_id.eq.${profile.id},profile2_id.eq.${profile.id}`);
      if (matchesError) throw matchesError;
      const matchedProfileIds = matchesData.map((match) =>
        match.profile1_id === profile.id ? match.profile2_id : match.profile1_id
      );

      const allRelatedProfileIds = new Set([
        ...incomingLikeIds,
        ...outgoingLikeIds,
        ...matchedProfileIds,
      ]);

      if (allRelatedProfileIds.size === 0) {
        setWhoLikedMe([]);
        setWhoILiked([]);
        setMatches([]);
        setIsLoading(false);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, gender, latitude, longitude, birth_date")
        .in("id", Array.from(allRelatedProfileIds));
      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData.map(p => [p.id, {
        ...p,
        isLiked: outgoingLikeIds.includes(p.id),
        isMatch: matchedProfileIds.includes(p.id),
      }]));

      const whoLikedMeProfiles = incomingLikeIds
        .filter(id => !matchedProfileIds.includes(id))
        .map(id => profilesMap.get(id) as Profile)
        .filter(p => p);

      const whoILikedProfiles = outgoingLikeIds
        .filter(id => !matchedProfileIds.includes(id))
        .map(id => profilesMap.get(id) as Profile)
        .filter(p => p);

      const matchesProfiles = matchedProfileIds
        .map(id => profilesMap.get(id) as Profile)
        .filter(p => p);

      setWhoLikedMe(whoLikedMeProfiles);
      setWhoILiked(whoILikedProfiles);
      setMatches(matchesProfiles);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      await showAlert(
        "error",
        "Ooops!",
        "Não foi possível carregar as curtidas e matches. Tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  }, [user, profile, userLoading, router]);

  const handleLike = async (targetProfileId: string) => {
    if (!user || !profile) {
      await showAlert("error", "Erro", "Usuário não autenticado.");
      return;
    }

    if (!hasPremiumSubscription) {
      await showAlert(
        "error",
        "Premium necessário",
        "Você precisa de uma assinatura premium para curtir perfis."
      );
      router.push("/subscription");
      return;
    }

    try {
      const { error: likeError } = await supabase
        .from("likes")
        .insert({ profile_id: profile.id, liked_profile_id: targetProfileId });

      if (likeError) throw likeError;

      const { error: matchError } = await supabase.from("matches").insert({
        profile1_id: profile.id < targetProfileId ? profile.id : targetProfileId,
        profile2_id: profile.id < targetProfileId ? targetProfileId : profile.id,
      });
      if (matchError) throw matchError;

      await showAlert("success", "Match!", "Parabéns! Você deu match com este perfil!");
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
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        <p className="mt-4 text-base font-medium text-gray-600">Carregando dados...</p>
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-200">
      <ProfileHeader name={profile.name} avatarUrl={profile.avatar_url} />
      <div className="max-w-4xl mx-auto w-full py-6 px-4">
        <TabGroup>
          <TabList className="flex gap-2 mb-6 bg-white p-2 rounded-xl shadow-sm overflow-x-auto">
            {["Quem me curtiu", "Quem eu curti", "Matches"].map((tab, idx) => (
              <Tab
                key={tab}
                className={({ selected }) =>
                  `flex-1 min-w-[100px] px-3 py-2 rounded-lg font-semibold text-[10px] transition-all duration-200 whitespace-nowrap ${
                    selected
                      ? "bg-gradient-to-r from-cyan-500 to-teal-400 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`
                }
              >
                {tab}
              </Tab>
            ))}
          </TabList>
          <TabPanels>
            <TabPanel>
              <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-400 scrollbar-track-gray-200 grid gap-4">
                {whoLikedMe.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-600 text-base font-medium bg-white rounded-xl shadow-sm">
                    Nenhum perfil te curtiu ainda.
                  </div>
                ) : (
                  whoLikedMe.map((profile, idx) => (
                    <ProfileCardComponent
                      key={profile.id}
                      profile={profile}
                      index={idx}
                      tab="Quem me curtiu"
                      handleLike={handleLike}
                      handleProfileInteraction={handleProfileInteraction}
                      hasPremiumSubscription={hasPremiumSubscription}
                    />
                  ))
                )}
              </div>
            </TabPanel>
            <TabPanel>
              <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-400 scrollbar-track-gray-200 grid gap-4">
                {whoILiked.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-600 text-base font-medium bg-white rounded-xl shadow-sm">
                    Você ainda não curtiu ninguém.
                  </div>
                ) : (
                  whoILiked.map((profile, idx) => (
                    <ProfileCardComponent
                      key={profile.id}
                      profile={profile}
                      index={idx}
                      tab="Quem eu curti"
                      handleLike={handleLike}
                      handleProfileInteraction={handleProfileInteraction}
                      hasPremiumSubscription={hasPremiumSubscription}
                    />
                  ))
                )}
              </div>
            </TabPanel>
            <TabPanel>
              <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-400 scrollbar-track-gray-200 grid gap-4">
                {matches.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-600 text-base font-medium bg-white rounded-xl shadow-sm">
                    Nenhum match por aqui.
                  </div>
                ) : (
                  matches.map((profile, idx) => (
                    <ProfileCardComponent
                      key={profile.id}
                      profile={profile}
                      index={idx}
                      tab="Matches"
                      handleLike={handleLike}
                      handleProfileInteraction={handleProfileInteraction}
                      hasPremiumSubscription={hasPremiumSubscription}
                    />
                  ))
                )}
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
      <MobileFooterMenu />
    </div>
  );
}
