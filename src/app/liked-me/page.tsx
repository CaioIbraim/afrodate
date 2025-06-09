"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { Loader2, ChevronLeft, User, Sparkles, Heart, MessageCircle, Grid3X3, User2Icon } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ProfileHeader } from "@/components/profile-header";
import { Profile } from "@/lib/profile-data";

interface LikedMeProfile {
  // This interface describes the structure of the profiles after processing the fetched data
  profile_id: string;
  name: string;
  avatar_url: string | null;
  gender: string | null; // Added for placeholder image logic
  isMatch: boolean;
}

// Define the type for items fetched from the 'likes' table with the 'profiles' join
interface LikeItemWithProfile { // Corrected interface name for clarity if it was used elsewhere
  // This interface describes the raw data structure returned directly by the Supabase query
  profile_id: string;
  // The 'profiles' property is expected to be an object or null, matching the Supabase select syntax
  profiles: { name: string; avatar_url: string | null; gender: string | null; } | null;
}

export default function LikedMePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, isLoading: userLoading } = useUser();
  const [likedMeProfiles, setLikedMeProfiles] = useState<LikedMeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLikedMeProfiles = async () => {
      if (!user || !profile || userLoading) {
        if (!userLoading) setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch profiles that liked the user
        const { data: likesData, error: likesError } = await supabase
          .from("likes")
          .select(`
            profile_id,
            profiles!likes_profile_id_fkey(name, avatar_url, gender)
          `)
          .eq("liked_profile_id", profile.id);

        if (likesError) {
          console.error("Error fetching likes:", likesError.message);
          throw likesError;
        }

        // Fetch mutual matches
        const { data: matchesData, error: matchesError } = await supabase
          .from("matches")
          .select("profile1_id, profile2_id")
          .or(`profile1_id.eq.${profile.id},profile2_id.eq.${profile.id}`);

        if (matchesError) {
          console.error("Error fetching matches:", matchesError.message);
          throw matchesError;
        }

        // Process likes and matches
        const matchedProfileIds = new Set(
          matchesData.flatMap((match) => [
            match.profile1_id === profile.id ? match.profile2_id : match.profile1_id,
          ])
        );

        const profilesData: LikedMeProfile[] = likesData // Removed unnecessary type assertion
 .filter((item) => item.profiles && item.profiles[0]?.name && item.profile_id)
          .map((item) => ({
            profile_id: item.profile_id,
 name: item.profiles[0]?.name,
 avatar_url: item.profiles[0]?.avatar_url,
 gender: item.profiles[0]?.gender,
 isMatch: matchedProfileIds.has(item.profile_id),
          }));

        setLikedMeProfiles(profilesData);
        console.log("Liked me profiles loaded:", profilesData);
      } catch (error: any) {
        console.error("Error fetching liked me profiles:", error.message);
        toast({
          title: "Erro",
          description: "Não foi possível carregar quem te curtiu.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLikedMeProfiles();
  }, [user, profile, userLoading, toast]);

  // Handle liking back to create a match
  const handleLikeBack = async (likerProfileId: string) => {
    try {
      const { error } = await supabase
        .from("likes")
        .insert({ profile_id: profile!.id, liked_profile_id: likerProfileId });

      if (error) {
        console.error("Error liking back:", error.message);
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Você deu like de volta! Verifique seus matches.",
      });

      // Refresh the list
      setIsLoading(true);
      const { data: likesData } = await supabase
        .from("likes")
        .select(`
          profile_id,
          profiles!likes_profile_id_fkey(name, avatar_url, gender)
        `)
        .eq("liked_profile_id", profile!.id);

      const { data: matchesData } = await supabase
        .from("matches")
        .select("profile1_id, profile2_id")
        .or(`profile1_id.eq.${profile!.id},profile2_id.eq.${profile!.id}`);

      const matchedProfileIds = new Set(
        matchesData!.flatMap((match) => [
          match.profile1_id === profile!.id ? match.profile2_id : match.profile1_id,
        ])
      );

      const profilesData: LikedMeProfile[] = likesData! // Removed unnecessary type assertion
 .filter((item) => item.profiles && item.profiles[0]?.name && item.profile_id)
        .map((item) => ({
          profile_id: item.profile_id,
 name: item.profiles[0]?.name,
 avatar_url: item.profiles[0]?.avatar_url,
 gender: item.profiles[0]?.gender,
          isMatch: matchedProfileIds.has(item.profile_id),
        }));

      setLikedMeProfiles(profilesData);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível dar like de volta.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle ignoring a like
  const handleIgnore = async (likerProfileId: string) => {
    try {
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("profile_id", likerProfileId)
        .eq("liked_profile_id", profile!.id);

      if (error) {
        console.error("Error ignoring like:", error.message);
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Like ignorado.",
      });

      // Update the list by removing the ignored profile
      setLikedMeProfiles((prev) =>
        prev.filter((p) => p.profile_id !== likerProfileId)
      );
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível ignorar o like.",
        variant: "destructive",
      });
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="app-container justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-oraculo-purple" />
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
        
    <ProfileHeader name={profile!.name} avatarUrl={profile!.avatar_url}/>
   
    <div className="app-container">
      {/* <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-6 w-6 text-oraculo-muted" />
        </Button>
        <Logo size="md" />
        <div className="flex gap-2">
          <Link href="/messages">
            <Button variant="ghost" size="icon" className="text-oraculo-muted relative">
              <MessageCircle className="h-6 w-6" />
            </Button>
          </Link>
          <Link href="/discover">
            <Button variant="ghost" size="icon" className="text-oraculo-muted">
              <Grid3X3 className="h-6 w-6" />
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="text-oraculo-muted relative">
              <User2Icon className="h-6 w-6" />
              </Button>
              </Link>
              </div>
              </div> */}

      <h2 className="text-xl gradient-text mb-8 text-center font-semibold">Pessoas que Curtiram Você</h2>

      {likedMeProfiles.length > 0 ? (
        <div className="space-y-6">
          {likedMeProfiles.map((likedProfile, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <div className="profile-card flex items-center gap-4 p-4">
                <div className="w-24 h-32 rounded-lg overflow-hidden">
                  {likedProfile.avatar_url ? (
                    <Image
                      src={likedProfile.avatar_url}
                      alt={`Foto de ${likedProfile.name}`}
                      width={200}
                      height={300}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <Image
                      src={
                        likedProfile.gender === "MULHER"
                          ? index % 2 === 0
                            ? "/images/female-profile-1.png"
                            : "/images/female-profile.png"
                          : "/images/male-profile-1.png"
                      }
                      alt={`Foto de ${likedProfile.name}`}
                      width={200}
                      height={300}
                      className="object-cover w-full h-full"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-oraculo-dark text-xl">{likedProfile.name}</h3>
                    <Badge
                      className={
                        likedProfile.isMatch
                          ? "bg-oraculo-purple/10 text-oraculo-purple text-xs flex items-center"
                          : "bg-white text-oraculo-muted text-xs border border-oraculo-purple/20"
                      }
                    >
                      {likedProfile.isMatch ? (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Match!
                        </>
                      ) : (
                        <>
                          <Heart className="h-3 w-3 mr-1" />
                          Like Recebido
                        </>
                      )}
                    </Badge>
                  </div>
                  {likedProfile.isMatch ? (
                    <Link href={`/profile/${likedProfile.profile_id}`}>
                      <Button className="gradient-button mt-3">Ver Perfil</Button>
                    </Link>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <Button
                        className="gradient-button flex-1"
                        onClick={() => handleLikeBack(likedProfile.profile_id)}
                      >
                        Dar Like
                      </Button>
                      <Button
                        variant="ghost"
                        className="flex-1 text-oraculo-muted"
                        onClick={() => handleIgnore(likedProfile.profile_id)}
                      >
                        Ignorar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="profile-card p-6 text-center">
          <h3 className="text-xl font-semibold text-oraculo-dark mb-4">
            Ninguém te curtiu ainda
          </h3>
          <p className="text-oraculo-muted mb-6">
            Parece que você ainda não recebeu curtidas. Continue explorando perfis no modo Descobrir!
          </p>
          <Link href="/discover">
            <Button className="gradient-button">Explorar Perfis</Button>
          </Link>
        </div>
      )}
    </div>
    </div>
  );
}