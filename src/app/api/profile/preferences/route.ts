import { NextApiRequest, NextApiResponse } from "next"
import { fetchProfileId, fetchProfile, updatePreferences } from "@/lib/supabaseAPI"
import { Preferences } from "@/lib/types"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, body, query } = req
  const userId = query.userId as string
  const profileId = await fetchProfileId(userId)

  if (!userId || !profileId) {
    return res.status(400).json({ error: "User ID or Profile ID is required" })
  }

  try {
    switch (method) {
      case "GET":
        const profile = await fetchProfile(profileId)
        if (!profile) {
          return res.status(404).json({ error: "Profile not found" })
        }
        return res.status(200).json({
          genderPreference: profile.gender_preference,
          minAge: profile.min_age,
          maxAge: profile.max_age,
          maxDistance: profile.max_distance,
          showProfile: profile.show_profile,
          matchNotifications: profile.match_notifications,
          messageNotifications: profile.message_notifications,
        })

      case "POST":
        if (!body || Object.keys(body).length === 0) {
          return res.status(400).json({ error: "Preferences data is required" })
        }
        await updatePreferences(profileId, body as Preferences)
        return res.status(200).json({ message: "Preferences updated successfully" })

      default:
        res.setHeader("Allow", ["GET", "POST"])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error("[API Profile Preferences] Error:", (error as Error).message)
    return res.status(500).json({ error: "Internal server error" })
  }
}