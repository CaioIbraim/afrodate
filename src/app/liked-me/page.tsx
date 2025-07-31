"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { Loader2, Heart, User2Icon, MessageCircle, Sparkles, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ProfileHeader } from "@/components/profile-header";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";

const MySwal = withReactContent(Swal);

// Tipos de dados mais precisos
interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  gender: string | null;
  latitude: number | null;
  longitude: number | null;
  birth_date?: string;
  distance?: number;
  isLiked: boolean; // Adicionado para manter a tipagem consistente
  isMatch: boolean; // Adicionado para manter a tipagem consistente
}

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

// --- NOVO COMPONENTE: ProfileCardComponent ---
// Agora é um componente React de primeira classe, então pode usar hooks
const ProfileCardComponent = ({
  profile: nearbyProfile,
  index,
  tab,
  handleLike,
  handleProfileInteraction
}: {
  profile: Profile;
  index: number;
  tab: string;
  handleLike: (id: string) => Promise<void>;
  handleProfileInteraction: (id: string, isMatch: boolean) => void;
}) => {
  return (
    <motion.div
      key={nearbyProfile.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100"
    >
      <div className="p-5 flex items-start gap-5">
        <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
          <Image
            src={nearbyProfile.avatar_url || (nearbyProfile.gender === "MULHER" ? "/images/female-profile.png" : "/images/male-profile-1.png")}
            alt={`Foto de ${nearbyProfile.name}`}
            width={150}
            height={150}
            className="object-cover w-full h-full"
            loading="lazy"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-800 mb-3 truncate">
            {nearbyProfile.name}
          </h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {nearbyProfile.distance && (
              <Badge className="bg-cyan-100 text-cyan-700 text-xs font-medium px-3 py-1 rounded-full flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {nearbyProfile.distance.toFixed(1)} km
              </Badge>
            )}
            {tab === "Matches" && (
              <Badge className="bg-gradient-to-r from-cyan-500 to-teal-400 text-white text-xs font-medium px-3 py-1 rounded-full flex items-center">
                <Sparkles className="h-4 w-4 mr-1" />
                Match!
              </Badge>
            )}
            {tab === "Quem eu curti" && (
              <Badge className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full flex items-center">
                Aguardando
              </Badge>
            )}
            {tab === "Quem me curtiu" && (
              <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-medium px-3 py-1 rounded-full flex items-center">
                <Heart className="h-4 w-4 mr-1" />
                Te Curtiu
              </Badge>
            )}
          </div>
          <div className="flex gap-3 w-full">
            <Link
              href={`/profile/${nearbyProfile.id}`}
              className="flex-1"
              onClick={() => handleProfileInteraction(nearbyProfile.id, !!nearbyProfile.isMatch)}
            >
              <Button
                variant="outline"
                className="w-full border-cyan-500 text-cyan-500 rounded-lg"
              >
                <User2Icon className="h-4 w-4 mr-2" />
                Ver Perfil
              </Button>
            </Link>

            {tab === "Matches" ? (
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
                className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-400 text-white hover:opacity-90 transition-opacity rounded-lg"
                onClick={() => handleLike(nearbyProfile.id)}
              >
                <Heart className="h-4 w-4 mr-2" />
                Curtir
              </Button>
            ) : null}
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
      // 1. Buscar os IDs dos perfis que te curtiram
      const { data: incomingLikes, error: incomingLikesError } = await supabase
        .from("likes")
        .select("profile_id")
        .eq("liked_profile_id", profile.id);
      if (incomingLikesError) throw incomingLikesError;
      const incomingLikeIds = incomingLikes.map((like) => like.profile_id);

      // 2. Buscar os IDs dos perfis que você curtiu
      const { data: outgoingLikes, error: outgoingLikesError } = await supabase
        .from("likes")
        .select("liked_profile_id")
        .eq("profile_id", profile.id);
      if (outgoingLikesError) throw outgoingLikesError;
      const outgoingLikeIds = outgoingLikes.map((like) => like.liked_profile_id);

      // 3. Buscar os IDs dos perfis com quem você deu match
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("profile1_id, profile2_id")
        .or(`profile1_id.eq.${profile.id},profile2_id.eq.${profile.id}`);
      if (matchesError) throw matchesError;
      const matchedProfileIds = matchesData.map((match) =>
        match.profile1_id === profile.id ? match.profile2_id : match.profile1_id
      );

      // 4. Juntar todos os IDs únicos para uma única query de perfil
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

      // 5. Buscar todos os dados dos perfis de uma só vez
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, gender, latitude, longitude, birth_date")
        .in("id", Array.from(allRelatedProfileIds));
      if (profilesError) throw profilesError;

      // Mapear os perfis buscados para cada categoria
      const profilesMap = new Map(profilesData.map(p => [p.id, p]));

      const whoLikedMeProfiles = profilesData
        .filter(p => incomingLikeIds.includes(p.id) && !matchedProfileIds.includes(p.id))
        .map(p => profilesMap.get(p.id) as Profile);
        
      const whoILikedProfiles = profilesData
        .filter(p => outgoingLikeIds.includes(p.id) && !matchedProfileIds.includes(p.id))
        .map(p => profilesMap.get(p.id) as Profile);

      const matchesProfiles = profilesData
        .filter(p => matchedProfileIds.includes(p.id))
        .map(p => profilesMap.get(p.id) as Profile);

      // A linha a seguir foi removida, pois os filtros foram desconsiderados
      // E a tipagem de Profile já inclui a propriedade 'distance'
      // O cálculo da distância também foi removido
      
      setWhoLikedMe(whoLikedMeProfiles.filter(p => p));
      setWhoILiked(whoILikedProfiles.filter(p => p));
      setMatches(matchesProfiles.filter(p => p));
      
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
              Quem me curtiu ({whoLikedMe.length})
            </Tab>
            <Tab className={({ selected }) =>
              `flex-1 px-4 py-3 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                selected
                  ? "bg-gradient-to-r from-cyan-500 to-teal-400 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`
            }>
              Quem eu curti ({whoILiked.length})
            </Tab>
            <Tab className={({ selected }) =>
              `flex-1 px-4 py-3 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                selected
                  ? "bg-gradient-to-r from-cyan-500 to-teal-400 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`
            }>
              Matches ({matches.length})
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
                  whoLikedMe.map((profile, idx) => (
                    <ProfileCardComponent
                      key={profile.id}
                      profile={profile}
                      index={idx}
                      tab="Quem me curtiu"
                      handleLike={handleLike}
                      handleProfileInteraction={handleProfileInteraction}
                    />
                  ))
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
                  whoILiked.map((profile, idx) => (
                    <ProfileCardComponent
                      key={profile.id}
                      profile={profile}
                      index={idx}
                      tab="Quem eu curti"
                      handleLike={handleLike}
                      handleProfileInteraction={handleProfileInteraction}
                    />
                  ))
                )}
              </div>
            </TabPanel>
            <TabPanel>
              <div className="grid gap-6">
                {matches.length === 0 ? (
                  <div className="text-center py-10 text-gray-600 text-lg font-medium bg-white rounded-xl shadow-sm">
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
                    />
                  ))
                )}
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </div>
  );
}