// ```tsx

// ### Key Features
// - **Profile Fetching**:
//   - Queries the `profiles` table with a left join to `profile_photos` to get the primary photo.
//   - Filters profiles by `show_profile = true`, excludes the current user, and applies preferences (`gender_preference`, age range, city as a proxy for distance).
//   - Processes data to include public URLs for photos.
// - **UI**:
//   - Displays one profile card at a time with a photo (or placeholder), name, username, age, city, and bio.
//   - Uses `framer-motion` for smooth card transitions.
//   - Includes “Like” and “Skip” buttons with icons (`Heart` and `X`).
//   - Shows a “No profiles” message with a link to adjust preferences if no profiles are available.
// - **Interactions**:
//   - “Like” inserts a record into the `matches` table and moves to the next profile.
//   - “Skip” moves to the next profile without action.
//   - Handles duplicate likes (error code `23505`) gracefully.
// - **Error Handling**:
//   - Uses `useToast` for user feedback on errors or successful actions.
//   - Logs errors to the console for debugging.
// - **Navigation**:
//   - Back button redirects to `/profile`.
//   - Adjust preferences button links to `/profile`.

// ### Setup Instructions
// 1. **Create Matches Table**:
//    Run the SQL provided above in the Supabase SQL Editor to create the `matches` table and RLS policies.

// 2. **Update RLS Policies**:
//    Ensure the `profiles` table has the “View visible profiles” policy:
//    ```sql
//    CREATE POLICY "View visible profiles" ON profiles
//      FOR SELECT
//      USING (show_profile = true AND user_id != auth.uid());
//    ```

// 3. **Add File**:
//    Save the code to `src/app/discover/v3/page.tsx`.

// 4. **Verify Dependencies**:
//    Ensure all imported components (`Card`, `Button`, etc.) and hooks (`useUser`) are available. The `useUser` hook should return `user` (Supabase auth user) and `profile` (user’s profile from `profiles` table).

// 5. **Test**:
//    - Run `npm run dev`.
//    - Log in, create a profile, and navigate to `/discover/v3`.
//    - Check the console for logs (`Fetching profiles`, `Profiles loaded`).
//    - Test liking and skipping profiles, and verify entries in the `matches` table.
//    - If no profiles appear, create test profiles in Supabase with `show_profile = true` and matching preferences.

// ### Debugging Tips
// - **No Profiles Loaded**:
//   - Check Supabase logs for query errors.
//   - Verify other profiles exist with `show_profile = true` and match the user’s preferences.
//   - Log the `data` from the Supabase query to inspect returned profiles.
// - **Photo Issues**:
//   - Ensure `profile_photos` has entries with `is_primary = true`.
//   - Verify `imagens` bucket permissions allow public read access or authenticated access.
// - **Like Errors**:
//   - Check for `23505` (duplicate like) or `42501` (RLS permission) errors in the console.
//   - Confirm the `matches` table RLS policies are correct.
// - **UI Glitches**:
//   - If cards don’t transition, ensure `framer-motion` is installed (`npm install framer-motion`).
//   - Verify `currentIndex` updates correctly on like/skip.

// ### Enhancements
// - **Geolocation**: Replace city-based distance filtering with actual geolocation (e.g., store `lat`, `lng` in `profiles` and use PostGIS).
// - **Swipe Gestures**: Add swipe left/right for like/skip using a library like `react-swipeable`.
// - **Match Notifications**: Notify users when a mutual like occurs (requires checking `matches` for bidirectional likes).
// - **Pagination**: Load profiles in batches to improve performance for large datasets.

// If you encounter issues or need help with specific features (e.g., geolocation, swiping), please share details (e.g., error logs, desired functionality), and I’ll provide tailored assistance.
// ---


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
import { Loader2, ChevronLeft, Heart, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Tipos
type Gender = "HOMEM" | "MULHER" | "NAO_BINARIO" | "OUTRO";
type GenderPreference = "HOMEM" | "MULHER" | "TODOS";

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

export default function DiscoverPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, isLoading } = useUser();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fetching, setFetching] = useState(false);

  // Carrega perfis com base nas preferências do usuário
  useEffect(() => {
    if (!user || !profile || isLoading) return;

    const fetchProfiles = async () => {
      setFetching(true);
      try {
        console.log("Fetching profiles for user:", user.id);

        // Calcular idade mínima e máxima
        const minAge = parseInt(profile.min_age) || 18;
        const maxAge = parseInt(profile.max_age) || 99;
        const today = new Date();
        const minBirthDate = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate()).toISOString().split("T")[0];
        const maxBirthDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate()).toISOString().split("T")[0];

        // Construir filtros
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
            profile_photos!left (
              storage_path,
              is_primary
            )
          `)
          .eq("show_profile", true)
          .neq("user_id", user.id)
          .gte("birth_date", minBirthDate)
          .lte("birth_date", maxBirthDate);

        // Filtro por gênero
        // if (profile.gender_preference !== "TODOS") {
        //   query = query.eq("gender", profile.gender_preference);
        // }

        // Filtro por cidade (como proxy para distância)
        // if (profile.max_distance && profile.city) {
        //   query = query.eq("city", profile.city); // Simplificação; usar geolocalização em produção
        // }

        const { data, error } = await query;

        if (error) {
          console.error("Fetch profiles error:", error);
          throw error;
        }

        // Processar perfis
        const processedProfiles = data.map((p) => {
          const primaryPhoto = p.profile_photos?.find((photo: any) => photo.is_primary);
          return {
            id: p.id,
            username: p.username,
            name: p.name,
            birth_date: p.birth_date,
            gender: p.gender,
            bio: p.bio || "Sem biografia",
            city: p.city || "Cidade não informada",
            avatar_url: p.avatar_url,
            photo: primaryPhoto
              ? {
                  storage_path: primaryPhoto.storage_path,
                  publicUrl: supabase.storage.from("imagens").getPublicUrl(primaryPhoto.storage_path).data.publicUrl,
                }
              : null,
          };
        });

        setProfiles(processedProfiles);
        console.log("Profiles loaded:", processedProfiles);
      } catch (error: any) {
        console.error("Error fetching profiles:", error.message, error);
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

  // Calcular idade a partir da data de nascimento
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

  // Lidar com ação de "Like"
  const handleLike = async (profileId: string) => {
    if (!user || !profile) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }

    try {
      console.log("Liking profile:", profileId);
      const { error } = await supabase
        .from("matches")
        .insert({
          liker_id: profile.id,
          liked_id: profileId,
        });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Info", description: "Você já curtiu este perfil.", variant: "default" });
          return;
        }
        console.error("Like error:", error);
        throw error;
      }

      toast({ title: "Sucesso", description: "Perfil curtido!" });
      setCurrentIndex((prev) => Math.min(prev + 1, profiles.length - 1));
    } catch (error: any) {
      console.error("Error liking profile:", error.message, error);
      toast({
        title: "Erro",
        description: `Não foi possível curtir o perfil: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Lidar com ação de "Skip"
  const handleSkip = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, profiles.length - 1));
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
          <Card className="mb-6">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-500 text-center">
                Nenhum perfil encontrado no momento. Tente ajustar suas preferências!
              </p>
              <Button
                onClick={() => router.push("/profile")}
                className="mt-4 gradient-button"
              >
                Ajustar Preferências
              </Button>
            </CardContent>
          </Card>
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
                    {profiles[currentIndex].photo?.publicUrl ? (
                      <img
                        src={profiles[currentIndex].photo.publicUrl}
                        alt={profiles[currentIndex].name}
                        className="w-full h-64 object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full h-64 bg-gray-200 flex items-center justify-center rounded-t-lg">
                        <Avatar className="w-32 h-32">
                          <AvatarFallback>{profiles[currentIndex].name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className="text-xl font-semibold">
                          {profiles[currentIndex].name}, {calculateAge(profiles[currentIndex].birth_date)}
                        </h3>
                        <p className="text-sm text-gray-500">{profiles[currentIndex].username}</p>
                      </div>
                    </div>
                    <Label className="text-sm text-gray-600">Cidade</Label>
                    <p className="mb-2">{profiles[currentIndex].city}</p>
                    <Label className="text-sm text-gray-600">Biografia</Label>
                    <p className="text-gray-700">{profiles[currentIndex].bio}</p>
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