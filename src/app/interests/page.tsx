"use client";
import { Suspense } from "react";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const MySwal = withReactContent(Swal);

// Define interfaces at the top of the file
type Gender = "HOMEM" | "MULHER" | "OUTRO";
type GenderPreference = "HOMEM" | "MULHER" | "TODOS";

interface ProfileData {
  name: string;
  birth_date: string;
  gender: Gender;
  bio: string;
  city: string;
  profession: string;
  interests: string[];
  latitude?: number | null;
  longitude?: number | null;
}

interface Preferences {
  genderPreference: GenderPreference;
  minAge: number;
  maxAge: number;
  maxDistance: number;
  showProfile: boolean;
  matchNotifications: boolean;
  messageNotifications: boolean;
}

interface Interest {
  id: number;
  name: string;
  storage_path: string | null;
  type: string;
}

const getFullImageUrl = (path: string | null): string => {
  if (!path) return "/images/placeholder-interest.jpg";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `https://wthyagnvodxbvmxkjhzb.supabase.co/storage/v1/object/public/interests/${path}`;
};

function InterestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, isLoading: userLoading } = useUser();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const interestType = searchParams.get("type");

  const showAlert = async (type: "success" | "error" | "info", title: string, text: string) => {
    return MySwal.fire({
      icon: type,
      title,
      text,
      customClass: {
        popup: "border-2 border-transparent bg-white rounded-2xl shadow-lg w-[90vw] max-w-sm",
        title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-xl font-bold",
        confirmButton: "bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-90",
      },
      willOpen: (popup) => {
        popup.setAttribute("aria-live", "assertive");
      },
    });
  };

  const isProfileComplete = (profileData: ProfileData | null, preferences: Preferences | null, hasPhoto: boolean): boolean => {
    if (!profileData || !preferences) return false;

    const requiredProfileFields: (keyof ProfileData)[] = ["name", "birth_date", "gender", "bio", "city", "profession"];
    const isProfileDataComplete = requiredProfileFields.every(
      (field) => profileData[field] !== null && profileData[field] !== ""
    );

    const requiredPreferenceFields: (keyof Preferences)[] = [
      "genderPreference",
      "minAge",
      "maxAge",
      "maxDistance",
      "showProfile",
      "matchNotifications",
      "messageNotifications",
    ];
    const isPreferencesComplete = requiredPreferenceFields.every(
      (field) => preferences[field] !== null && preferences[field] !== undefined
    );

    return isProfileDataComplete && isPreferencesComplete && hasPhoto;
  };

  useEffect(() => {
    if (userLoading) return;

    if (!user || !profile) {
      showAlert("error", "Erro", "Usuário não autenticado. Faça login novamente.");
      router.push("/login");
      return;
    }

    const fetchInterests = async () => {
      try {
        // Fetch all available interests, filtered by type if provided
        let query = supabase
          .from("interests")
          .select("id, name, storage_path, type")
          .order("name", { ascending: true });

        if (interestType) {
          query = query.eq("type", interestType);
        }

        const { data: interestsData, error: interestsError } = await query;

        if (interestsError) {
          throw new Error("Erro ao carregar interesses: " + interestsError.message);
        }

        // Fetch user's current interests
        const { data: userInterests, error: userInterestsError } = await supabase
          .from("profile_interests")
          .select("interests_id")
          .eq("profile_id", profile.id);

        if (userInterestsError) {
          throw new Error("Erro ao carregar interesses do usuário: " + userInterestsError.message);
        }

        setInterests(interestsData || []);
        setSelectedInterests(userInterests?.map((item) => item.interests_id) || []);
      } catch (error: any) {
        console.error("Fetch interests error:", error);
        await showAlert("error", "Erro", error.message || "Não foi possível carregar os interesses.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterests();
  }, [user, profile, userLoading, router, interestType]);

  const handleInterestToggle = (interestId: number) => {
    setSelectedInterests((prev) => {
      if (prev.includes(interestId)) {
        return prev.filter((id) => id !== interestId);
      }
      if (prev.length >= 10) {
        showAlert("info", "Limite atingido", "Você deve selecionar exatamente 10 interesses. Desmarque um para adicionar outro.");
        return prev;
      }
      return [...prev, interestId];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedInterests.length !== 10) {
      await showAlert("error", "Selecione 10 interesses", "Você deve selecionar exatamente 10 interesses para continuar.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Delete existing interests
      const { error: deleteError } = await supabase
        .from("profile_interests")
        .delete()
        .eq("profile_id", profile?.id);

      if (deleteError) {
        throw new Error("Erro ao atualizar interesses: " + deleteError.message);
      }

      // Insert new interests (exactly 10)
      const inserts = selectedInterests.map((interestId) => ({
        profile_id: profile?.id,
        interests_id: interestId,
      }));

      const { error: insertError } = await supabase.from("profile_interests").insert(inserts);
      if (insertError) {
        throw new Error("Erro ao salvar interesses: " + insertError.message);
      }

      // Fetch profile data and preferences
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("name, birth_date, gender, bio, city, profession, gender_preference, min_age, max_age, max_distance, show_profile, match_notifications, message_notifications, latitude, longitude")
        .eq("id", profile?.id)
        .single();

      if (profileError) {
        throw new Error("Erro ao verificar perfil: " + profileError.message);
      }

      // Check for any photo
      const { data: photos, error: photosError } = await supabase
        .from("profile_photos")
        .select("id")
        .eq("profile_id", profile?.id)
        .limit(1);

      if (photosError) {
        throw new Error("Erro ao verificar fotos: " + photosError.message);
      }

      const profileComplete = isProfileComplete(
        {
          name: profileData.name,
          birth_date: profileData.birth_date,
          gender: profileData.gender,
          bio: profileData.bio,
          city: profileData.city,
          profession: profileData.profession,
          interests: selectedInterests.map((id) => interests.find((i) => i.id === id)?.name || ""),
          latitude: profileData.latitude,
          longitude: profileData.longitude,
        },
        {
          genderPreference: profileData.gender_preference,
          minAge: profileData.min_age,
          maxAge: profileData.max_age,
          maxDistance: profileData.max_distance,
          showProfile: profileData.show_profile,
          matchNotifications: profileData.match_notifications,
          messageNotifications: profileData.message_notifications,
        },
        photos?.length > 0
      );

      await showAlert("success", "Interesses salvos!", "Redirecionando...");

      if (!profileComplete) {
        router.push("/profile");
      } else {
        router.push("/discover/v6");
      }
    } catch (error: any) {
      console.error("Submit interests error:", error);
      await showAlert("error", "Erro", error.message || "Não foi possível salvar os interesses.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E1E1E]" />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-50 p-6">
      <div className="w-full max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] mb-4 text-center">
            Escolha Seus Interesses{interestType ? ` - ${interestType}` : ""}
          </h2>
          <p className="text-neutral-600 mb-6 text-center">
            Clique em exatamente 10 interesses para personalizar sua experiência.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
              {interests.length > 0 ? (
                interests.map((interest, index) => (
                  <motion.div
                    key={interest.id}
                    initial={{ opacity: 0, scale: 0.910 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.010 }}
                    className={`relative rounded-lg overflow-hidden h-32 cursor-pointer transition-all duration-200 ${
                      selectedInterests.includes(interest.id)
                        ? "border-4 border-[#00FFD1] shadow-lg"
                        : "border-2 border-gray-200 hover:border-oraculo-cyan"
                    }`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selectedInterests.includes(interest.id)}
                    aria-label={`Selecionar interesse ${interest.name}`}
                    onClick={() => handleInterestToggle(interest.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleInterestToggle(interest.id);
                      }
                    }}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${getFullImageUrl(interest.storage_path)})` }}
                    />
                    <div className="absolute inset-0 bg-black/100 flex items-center justify-center">
                      <Label className="text-white text-sm font-semibold text-center px-2">
                        {interest.name}
                      </Label>
                    </div>
                    {selectedInterests.includes(interest.id) && (
                      <div className="absolute top-2 right-2 bg-[#00FFD1] rounded-full p-1">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </motion.div>
                ))
              ) : (
                <p className="text-neutral-600 text-center col-span-full">
                  Nenhum interesse encontrado para o tipo selecionado.
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-oraculo-cyan to-[#1E1E1E] text-white hover:opacity-90 focus:ring-2 focus:ring-[#1E1E1E]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </span>
              ) : (
                <>
                  Salvar Interesses
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default function InterestsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-50" aria-live="polite">
          <Loader2 className="h-8 w-8 animate-spin text-[#00FFD1]" />
          <span className="sr-only">Carregando...</span>
        </div>
      }
    >
      <InterestsContent />
    </Suspense>
  );
}

// Optional: Force dynamic rendering to avoid static generation issues
export const dynamic = "force-dynamic";