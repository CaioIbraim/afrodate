import { NextApiRequest, NextApiResponse } from "next"
import { fetchProfileId, fetchProfile, updateProfile } from "@/lib/supabaseAPI"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, body, query } = req
  const userId = query.userId as string
  const profileId = await fetchProfileId(userId)

  if (!userId || !profileId) {
    return res.status(400).json({ error: "User ID or Profile ID is required" })
  }

  try {
    switch (method) {
      case "GET": {
        const profile = await fetchProfile(profileId)
        if (!profile) {
          return res.status(404).json({ error: "Profile not found" })
        }
        return res.status(200).json({ interests: profile.interests })
      }

      case "POST": {
        if (!body.interests || !Array.isArray(body.interests)) {
          return res.status(400).json({ error: "Interests array is required" })
        }

        await updateProfile(profileId, { interests: body.interests }, null)
        return res.status(200).json({ message: "Interests updated successfully" })
      }

      default:
        res.setHeader("Allow", ["GET", "POST"])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error("[API Profile Interests] Error:", (error as Error).message)
    return res.status(500).json({ error: "Internal server error" })
  }
}
