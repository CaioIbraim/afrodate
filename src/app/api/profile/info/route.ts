import { NextApiRequest, NextApiResponse } from "next"
import { createProfile, fetchProfile, updateProfile, fetchProfileId } from "@/lib/supabaseAPI"
import { ProfileData } from "@/lib/types"
import { supabase } from "@/lib/supabase"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, body, query } = req
  const userId = query.userId as string

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" })
  }

  try {
    switch (method) {
      case "GET":
        const profileId = await fetchProfileId(userId)
        if (!profileId) {
          return res.status(404).json({ error: "Profile not found" })
        }
        const profile = await fetchProfile(profileId)
        if (!profile) {
          return res.status(404).json({ error: "Profile not found" })
        }
        return res.status(200).json({
          name: profile.name,
          birth_date: profile.birth_date,
          gender: profile.gender,
          bio: profile.bio,
          city: profile.city,
          profession: profile.profession,
          latitude: profile.latitude,
          longitude: profile.longitude,
          whatsapp_number: profile.whatsapp_number,
          share_whatsapp: profile.share_whatsapp,
          avatar_url: profile.avatar_url,
        })

      case "POST":
        if (!body || Object.keys(body).length === 0) {
          return res.status(400).json({ error: "Profile data is required" })
        }
        let newProfileId = await fetchProfileId(userId)
        if (!newProfileId) {
          const username = await generateUsername(body.name || "user")
          newProfileId = await createProfile(userId, body, username)
        } else {
          await updateProfile(newProfileId, body, body.avatar_url || null)
        }
        return res.status(200).json({ profileId: newProfileId, message: "Profile saved successfully" })

      default:
        res.setHeader("Allow", ["GET", "POST"])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error("[API Profile Info] Error:", (error as Error).message)
    return res.status(500).json({ error: "Internal server error" })
  }
}


const generateUsername = async (name: string): Promise<string> => {
    const baseUsername = "@" + name.toLowerCase().replace(/\s+/g, "")
    let username = baseUsername
    let counter = 1
    while (true) {
      const { data, error } = await supabase.from("profiles").select("username").eq("username", username).single()
      if (error || !data) break
      username = `${baseUsername}${counter}`
      counter++
    }
    return username
  }

