import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ProfileService } from "@/lib/services/profile-service"
import type { ProfileData, GenderPreference } from "@/lib/types"

const profileService = ProfileService.getInstance()

export function useProfiles(filters?: {
  searchTerm?: string
  maxDistance?: number
  minCompatibility?: number
  location?: string
  genderPreference?: GenderPreference
}) {
  return useQuery([
    "profiles",
    filters?.searchTerm,
    filters?.maxDistance,
    filters?.minCompatibility,
    filters?.location,
    filters?.genderPreference,
  ], () => profileService.getProfiles(filters), {
    keepPreviousData: true,
  })
}

export function useProfile(id: number) {
  return useQuery(["profile", id], () => profileService.getProfileById(id), {
    enabled: !!id,
  })
}

export function useLikeProfile() {
  const queryClient = useQueryClient()

  return useMutation(
    ({ userId, profileId }: { userId: number; profileId: number }) =>
      profileService.likeProfile(userId, profileId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["profiles"])
        queryClient.invalidateQueries(["matches"])
      },
    }
  )
}