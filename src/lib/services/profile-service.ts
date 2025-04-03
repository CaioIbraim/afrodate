import { ProfileData, GenderPreference, MatchResult } from "../types"
import { profilesData } from "../profile-data"
import { calculateCompatibility } from "../match-utils"

export class ProfileService {
  private static instance: ProfileService
  private profiles: ProfileData[]
  private cache: Map<string, { data: any; timestamp: number }>
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  private constructor() {
    this.profiles = profilesData
    this.cache = new Map()
  }

  public static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService()
    }
    return ProfileService.instance
  }

  private getCacheKey(method: string, params: any): string {
    return `${method}:${JSON.stringify(params)}`
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key)
      return null
    }

    return cached.data as T
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  public async getProfiles(filters?: {
    searchTerm?: string
    maxDistance?: number
    minCompatibility?: number
    location?: string
    genderPreference?: GenderPreference
    interests?: string[]
  }): Promise<ProfileData[]> {
    try {
      const cacheKey = this.getCacheKey('getProfiles', filters)
      const cached = this.getFromCache<ProfileData[]>(cacheKey)
      if (cached) return cached

      let filteredProfiles = [...this.profiles]

      if (filters) {
        const { searchTerm, maxDistance, minCompatibility, location, genderPreference, interests } = filters

        if (searchTerm) {
          const terms = searchTerm.toLowerCase().split(' ')
          filteredProfiles = filteredProfiles.filter(
            (profile) =>
              terms.some(term => profile.name.toLowerCase().includes(term)) ||
              terms.some(term => profile.city.toLowerCase().includes(term)) ||
              terms.some(term => profile.bio.toLowerCase().includes(term))
          )
        }

        if (maxDistance) {
          filteredProfiles = filteredProfiles.filter(
            (profile) => Number.parseInt(profile.distance) <= maxDistance
          )
        }

        if (minCompatibility) {
          filteredProfiles = filteredProfiles.filter(
            (profile) => (profile.compatibility || 0) >= minCompatibility
          )
        }

        if (location) {
          filteredProfiles = filteredProfiles.filter((profile) =>
            profile.locations.includes(location)
          )
        }

        if (genderPreference && genderPreference !== "TODOS") {
          filteredProfiles = filteredProfiles.filter(
            (profile) => profile.gender === genderPreference
          )
        }

        if (interests && interests.length > 0) {
          filteredProfiles = filteredProfiles.filter((profile) =>
            interests.some(interest => profile.interests.includes(interest))
          )
        }

        // Sort by compatibility and distance
        filteredProfiles.sort((a, b) => {
          const compatDiff = (b.compatibility || 0) - (a.compatibility || 0)
          if (compatDiff !== 0) return compatDiff
          return Number.parseInt(a.distance) - Number.parseInt(b.distance)
        })
      }

      this.setCache(cacheKey, filteredProfiles)
      return filteredProfiles
    } catch (error) {
      console.error("Error filtering profiles:", error)
      throw new Error(`Failed to filter profiles: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async getProfileById(id: number): Promise<ProfileData> {
    try {
      const cacheKey = this.getCacheKey('getProfileById', id)
      const cached = this.getFromCache<ProfileData>(cacheKey)
      if (cached) return cached

      const profile = this.profiles.find((p) => p.id === id)
      if (!profile) {
        throw new Error(`Profile with ID ${id} not found`)
      }

      this.setCache(cacheKey, profile)
      return profile
    } catch (error) {
      console.error("Error fetching profile:", error)
      throw new Error(`Failed to fetch profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async calculateMatchResult(
    userProfile: ProfileData,
    otherProfile: ProfileData
  ): Promise<MatchResult> {
    try {
      const cacheKey = this.getCacheKey('calculateMatchResult', { userId: userProfile.id, otherId: otherProfile.id })
      const cached = this.getFromCache<MatchResult>(cacheKey)
      if (cached) return cached

      const result = calculateCompatibility(
        userProfile.interests,
        userProfile.locations,
        otherProfile.interests,
        otherProfile.locations
      )

      this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error("Error calculating match result:", error)
      throw new Error(`Failed to calculate match result: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async likeProfile(userId: number, profileId: number): Promise<void> {
    try {
      // Implement like functionality with rate limiting
      const now = Date.now()
      const cacheKey = `like:${userId}`
      const lastLike = this.getFromCache<number>(cacheKey)

      if (lastLike && now - lastLike < 1000) { // 1 second rate limit
        throw new Error('Please wait before liking another profile')
      }

      // TODO: Implement actual like storage in database
      this.setCache(cacheKey, now)
    } catch (error) {
      console.error("Error liking profile:", error)
      throw new Error(`Failed to like profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}