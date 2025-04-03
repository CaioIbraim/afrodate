import { ProfileData, GenderPreference, MatchResult, SubscriptionTier } from "../types"

interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

interface ApiError extends Error {
  status?: number
  code?: string
}

export class ApiService {
  private static instance: ApiService
  private readonly API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private cache: Map<string, { data: any; timestamp: number }>

  private constructor() {
    this.cache = new Map()
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService()
    }
    return ApiService.instance
  }

  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}:${JSON.stringify(params || {})}`
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

  private async fetchWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        const error: ApiError = new Error('API request failed')
        error.status = response.status
        throw error
      }

      const data = await response.json()
      return { data, status: response.status }
    } catch (error) {
      if (retries > 0 && error instanceof Error && error.name !== 'AbortError') {
        await new Promise(resolve => setTimeout(resolve, 1000))
        return this.fetchWithRetry<T>(endpoint, options, retries - 1)
      }
      throw error
    }
  }

  public async getProfiles(filters?: {
    searchTerm?: string
    maxDistance?: number
    minCompatibility?: number
    location?: string
    genderPreference?: GenderPreference
  }): Promise<ApiResponse<ProfileData[]>> {
    const cacheKey = this.getCacheKey('/profiles', filters)
    const cached = this.getFromCache<ApiResponse<ProfileData[]>>(cacheKey)
    if (cached) return cached

    try {
      const response = await this.fetchWithRetry<ProfileData[]>(
        `/profiles?${new URLSearchParams(filters as any).toString()}`
      )
      this.setCache(cacheKey, response)
      return response
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch profiles',
        status: (error as ApiError).status || 500,
      }
    }
  }

  public async getProfileById(id: number): Promise<ApiResponse<ProfileData>> {
    const cacheKey = this.getCacheKey(`/profiles/${id}`)
    const cached = this.getFromCache<ApiResponse<ProfileData>>(cacheKey)
    if (cached) return cached

    try {
      const response = await this.fetchWithRetry<ProfileData>(`/profiles/${id}`)
      this.setCache(cacheKey, response)
      return response
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch profile',
        status: (error as ApiError).status || 500,
      }
    }
  }

  public async updateProfile(id: number, data: Partial<ProfileData>): Promise<ApiResponse<ProfileData>> {
    try {
      return await this.fetchWithRetry<ProfileData>(`/profiles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to update profile',
        status: (error as ApiError).status || 500,
      }
    }
  }

  public async likeProfile(userId: number, profileId: number): Promise<ApiResponse<void>> {
    try {
      return await this.fetchWithRetry<void>('/likes', {
        method: 'POST',
        body: JSON.stringify({ userId, profileId }),
      })
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to like profile',
        status: (error as ApiError).status || 500,
      }
    }
  }

  public async updateSubscription(userId: number, tier: SubscriptionTier): Promise<ApiResponse<void>> {
    try {
      return await this.fetchWithRetry<void>('/subscription', {
        method: 'POST',
        body: JSON.stringify({ userId, tier }),
      })
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to update subscription',
        status: (error as ApiError).status || 500,
      }
    }
  }
}