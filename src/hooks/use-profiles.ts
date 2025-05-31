import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ProfileService } from "@/lib/services/profile-service"
import type { ProfileData, GenderPreference } from "@/lib/types"
import { supabase } from "@/lib/supabase"

const profileService = ProfileService.getInstance()

// export function useProfiles(user, profileId) {
//   // Ensure profileId is passed as an argument to this function
//   return supabase.from('profiles').select().match({
//     user_id: user.id,
//     profile_id: profileId,
//   });
// }

export function useProfile(id: number) {
  return useQuery({
    queryKey: ["profile", id],
    queryFn: () => profileService.getProfileById(id),
    enabled: !!id,
  })
}

export function useLikeProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, profileId }: { userId: number; profileId: number }) => {
      const { data, error } = await supabase
        .from('likes')
        .insert([
          { 
            user_id: userId, 
            liked_user_id: profileId,
            created_at: new Date().toISOString()
          }
        ])
        .select()

      if (error) {
        console.log("Error inserting like:", error.message) // Log do erro
        throw new Error(error.message)
      }
      return data
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.invalidateQueries({ queryKey: ['matches', userId] }) // Garantir que os matches sejam invalidados para o usuário específico
    },
    onError: (error) => {
      console.log("Mutation error:", error) // Tratamento de erro adicional
    },
  })
}