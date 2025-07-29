import { UUID } from "crypto"

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

export interface ProfilePhotos {
id: UUID
profile_id : UUID
storage_path : string
url?:string
is_primary: boolean

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
  profile_photos: ProfilePhotos
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

export interface Profile {
  id: string
  user_id: string
  username: string
  name: string
  birth_date: string
  gender: Gender
  bio: string
  city: string
  profession: string
  interests: string[]
  avatar_url: string | null
  latitude: number | null
  longitude: number | null
  whatsapp_number: string | null
  share_whatsapp: boolean
  gender_preference: GenderPreference
  min_age: number
  max_age: number
  max_distance: number
  show_profile: boolean
  match_notifications: boolean
  message_notifications: boolean
  created_at: string
  updated_at: string | null
}

export interface ProfileData {
  name: string
  birth_date: string
  gender: Gender
  bio: string
  city: string
  profession: string
  interests: string[]
  latitude?: number | null
  longitude?: number | null
  whatsapp_number?: string
  share_whatsapp?: boolean
  avatar_url?: string | null
}

export interface Preferences {
  genderPreference: GenderPreference
  minAge: number
  maxAge: number
  maxDistance: number
  showProfile: boolean
  matchNotifications: boolean
  messageNotifications: boolean
}

export interface Photo {
  name: string
  storage_path: string
  publicUrl: string
  isPrimary: boolean
}

export interface Errors {
  [key: string]: string
}

export interface LocationState {
  status: "idle" | "requesting" | "granted" | "denied" | "unavailable" | "error"
  latitude: number | null
  longitude: number | null
  error: string | null
  accuracy: number | null
}




