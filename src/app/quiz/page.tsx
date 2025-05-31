"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { Loader2, ChevronLeft, Heart, X, User, AlertCircle } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";

// Tipos
type Gender = "HOMEM" | "MULHER" | "NAO_BINARIO" | "OUTRO";
interface Profile {
  id: string;
  username: string;
  name: string;
  birth_date: string;
  gender: Gender;
  bio: string;
  city: string;
  avatar_url: string | null;
  photo: { storage_path: string; publicUrl: string } | null;
}

// Componente Dinâmico para Mensagem de Nenhum Perfil
const NoProfilesMessage = ({ profile }: { profile: any }) => {
  const router = useRouter();
  const today = new Date();
  const birthDate = new Date(profile?.birth_date);
  const age = today.getFullYear() - birthDate.getFullYear();

  const minAge = parseInt(profile.min_age) || 18;
  const maxAge = parseInt(profile.max_age) || 99;

  const isAgeFilterTooRestrictive = maxAge - minAge < 5;
  const needsQuiz = !profile.quizCompleted; // Supondo que isso venha do backend ou estado

  return (
    <Card className="mb-6 shadow-md">
      <CardContent className="flex flex-col items-center justify-center py-10 px-6 text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
        <h3 className="text-xl font-semibold mb-3">Nenhum perfil disponível</h3>
        <p className="text-gray-600 mb-4">
          Não encontramos perfis compatíveis com suas preferências atuais. Isso pode acontecer por:
        </p>

        <ul className="text-left text-sm text-gray-500 list-disc pl-5 space-y-1 mb-6">
          {isAgeFilterTooRestrictive && (
            <li>Seus filtros de idade estão muito restritos (menos de 5 anos de diferença).</li>
          )}
          {!needsQuiz && (
            <li>Você ainda não respondeu ao Quiz de Africanidades (11 perguntas).</li>
          )}
          <li>Não há perfis ativos dentro do seu raio de busca.</li>
        </ul>

        <div className="space-y-3 w-full max-w-xs">
          {isAgeFilterTooRestrictive && (
            <Button
              onClick={() => router.push("/profile")}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              Ajustar Faixa Etária
            </Button>
          )}

          {needsQuiz && (
            <Button
              onClick={() => router.push("/quiz/africanidades")}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Responder Quiz de Africanidades
            </Button>
          )}

          <Button
            onClick={() => router.push("/profile")}
            variant="outline"
            className="w-full border-gray-300 text-gray-700"
          >
            Verificar Preferências Gerais
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DiscoverPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, isLoading } = useUser();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!user || !profile || isLoading) return;
    const fetchProfiles = async () => {
      setFetching(true);
      try {
        console.log("Fetching profiles for user:", user.id);

        const today = new Date();
        const minAge = parseInt(profile.min_age) || 18;
        const maxAge = parseInt(profile.max_age) || 99;
        const minBirthDate = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate())
          .toISOString()
          .split("T")[0];
        const maxBirthDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate())
          .toISOString()
          .split("T")[0];

        const { data: viewedData } = await supabase
          .from("profile_views")
          .select("viewed_id")
          .eq("viewer_id", profile.id);

        const { data: likedData } = await supabase
          .from("matches")
          .select("liked_id")
          .eq("liker_id", profile.id);

        const excludedIds = [
          ...(viewedData?.map((v) => v.viewed_id) || []),
          ...(likedData?.map((l) => l.liked_id) || []),
        ];

        let query = supabase
          .from("profiles")
          .select(`
            id,
            username,
            name,
            birth_date,
            gender,
            bio,
            city,
            avatar_url,
            profile_photos!left (storage_path)
          `)
          .eq("show_profile", true)
          .neq("user_id", user.id)
          .gte("birth_date", minBirthDate)
          .lte("birth_date", maxBirthDate);

        if (excludedIds.length > 0) {
          query = query.not("id", "in", `(${excludedIds.join(",")})`);
        }

        const { data, error } = await query;
        if (error) throw error;

        const processedProfiles = data.map((p) => {
          const firstPhoto = p.profile_photos?.[0];
          return {
            id: p.id,
            username: p.username,
            name: p.name,
            birth_date: p.birth_date,
            gender: p.gender,
            bio: p.bio || "Sem biografia",
            city: p.city || "Cidade não informada",
            avatar_url: p.avatar_url,
            photo: firstPhoto
              ? {
                  storage_path: firstPhoto.storage_path,
                  publicUrl: supabase.storage
                    .from("imagens")
                    .getPublicUrl(firstPhoto.storage_path).data.publicUrl,
                }
              : null,
          };
        });

        setProfiles(processedProfiles);
        console.log("Profiles loaded:", processedProfiles);

        if (processedProfiles.length > 0) {
          await supabase.from("profile_views").insert({
            viewer_id: profile.id,
            viewed_id: processedProfiles[0].id,
          });
        }
      } catch (error: any) {
        console.error("Error fetching profiles:", error.message);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os perfis.",
          variant: "destructive",
        });
      } finally {
        setFetching(false);
      }
    };

    fetchProfiles();
  }, [user, profile, isLoading, toast]);

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleLike = async (profileId: string) => {
    if (!user || !profile) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }
    try {
      const { error: insertError } = await supabase
        .from("matches")
        .insert({ liker_id: profile.id, liked_id: profileId, status: "pending" });

      if (insertError?.code === "23505") {
        toast({ title: "Info", description: "Você já curtiu este perfil." });
        return;
      }

      await supabase.from("profile_views").insert({
        viewer_id: profile.id,
        viewed_id: profileId,
      });

      const { data: mutualLike } = await supabase
        .from("matches")
        .select("id")
        .eq("liker_id", profileId)
        .eq("liked_id", profile.id)
        .single();

      if (mutualLike) {
        await supabase
          .from("matches")
          .update({ status: "matched" })
          .eq("liker_id", profile.id)
          .eq("liked_id", profileId);
        await supabase
          .from("matches")
          .update({ status: "matched" })
          .eq("liker_id", profileId)
          .eq("liked_id", profile.id);

        toast({ title: "Match!", description: `Você deu match com ${profiles[currentIndex].name}!` });
      } else {
        toast({ title: "Sucesso", description: "Perfil curtido!" });
      }

      setCurrentIndex((prev) => {
        const nextIndex = Math.min(prev + 1, profiles.length - 1);
        if (nextIndex < profiles.length) {
          supabase.from("profile_views").insert({
            viewer_id: profile.id,
            viewed_id: profiles[nextIndex].id,
          });
        }
        return nextIndex;
      });
    } catch (error: any) {
      console.error("Error liking profile:", error.message);
      toast({
        title: "Erro",
        description: `Não foi possível curtir o perfil: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleSkip = async () => {
    if (!user || !profile) return;

    await supabase.from("profile_views").insert({
      viewer_id: profile.id,
      viewed_id: profiles[currentIndex].id,
    });

    setCurrentIndex((prev) => {
      const nextIndex = Math.min(prev + 1, profiles.length - 1);
      if (nextIndex < profiles.length) {
        supabase.from("profile_views").insert({
          viewer_id: profile.id,
          viewed_id: profiles[nextIndex].id,
        });
      }
      return nextIndex;
    });
  };

  if (isLoading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    router.push("/login");
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 px-4 py-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/profile")}>
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </Button>
        <Logo size="sm" />
        <div className="w-10"></div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md mx-auto w-full"
      >
        <h2 className="text-2xl font-bold gradient-text text-center mb-6">Descobrir Perfis</h2>

        {profiles.length === 0 || currentIndex >= profiles.length ? (
          <NoProfilesMessage profile={profile} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="mb-6">
                <CardContent className="p-0">
                  <div className="relative">
                    {profiles[currentIndex].photo?.publicUrl ||
                    profiles[currentIndex].avatar_url ? (
                      <img
                        src={
                          profiles[currentIndex].photo?.publicUrl ||
                          profiles[currentIndex].avatar_url!
                        }
                        alt={profiles[currentIndex].name}
                        className="w-full h-64 object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full h-64 bg-gray-200 flex items-center justify-center rounded-t-lg">
                        <Avatar className="w-32 h-32">
                          <AvatarFallback>
                            {profiles[currentIndex].name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <Link href={`/profile/${profiles[currentIndex].id}`}>
                          <h3 className="text-xl font-semibold hover:underline">
                            {profiles[currentIndex].name},{" "}
                            {calculateAge(profiles[currentIndex].birth_date)}
                          </h3>
                        </Link>
                        <p className="text-sm text-gray-500">{profiles[currentIndex].username}</p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/profile/${profiles[currentIndex].id}`}>
                          <User className="h-5 w-5" />
                          Ver Perfil
                        </Link>
                      </Button>
                    </div>
                    <Label className="text-sm text-gray-600">Cidade</Label>
                    <p className="mb-2">{profiles[currentIndex].city}</p>
                    <Label className="text-sm text-gray-600">Biografia</Label>
                    <p className="text-gray-700">
                      {profiles[currentIndex].bio.length > 150 
                        ? `${profiles[currentIndex].bio.slice(0, 150)}...`
                        : profiles[currentIndex].bio}
                    </p>
                  </div>
                </CardContent>
                <CardContent className="flex justify-center gap-4 pt-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleSkip}
                    className="rounded-full w-12 h-12"
                  >
                    <X className="h-6 w-6 text-red-500" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleLike(profiles[currentIndex].id)}
                    className="rounded-full w-12 h-12"
                  >
                    <Heart className="h-6 w-6 text-green-500" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}