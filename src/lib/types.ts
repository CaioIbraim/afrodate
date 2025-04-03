export type Gender = "HOMEM" | "MULHER" | "NAO_BINARIO" | "OUTRO"

export type GenderPreference = "HOMEM" | "MULHER" | "TODOS"

export type SubscriptionTier = "FREE" | "PREMIUM" | "VIP"

export interface UserProfile {
  id: string
  name: string
  age: number
  gender: Gender
  genderPreference: GenderPreference
  city: string
  bio?: string
  interests: string[]
  locations: string[]
  photos: string[]
  subscriptionTier: SubscriptionTier
  contactInfo?: {
    phone?: string
    email?: string
    whatsapp?: string
  }
}

export interface MatchResult {
  score: number
  commonInterests: string[]
  commonLocations: string[]
  crossMatches: string[]
}

export interface ProfileData {
  id: number
  name: string
  age: number
  gender: Gender
  city: string
  distance: string
  bio: string
  compatibility?: number
  interests: string[]
  locations: string[]
  photos: string[]
  crossMatches?: string[]
  isPremium?: boolean
  contactInfo?: {
    whatsapp?: string
  }
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  interval: "month" | "year"
  features: string[]
  tier: SubscriptionTier
  popular?: boolean
  discount?: number
}

