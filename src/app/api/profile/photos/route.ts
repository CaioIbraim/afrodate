import { NextApiRequest, NextApiResponse } from "next"
import { fetchProfileId, loadProfilePhotos, uploadPhoto, deletePhoto, setPrimaryPhoto } from "@/lib/supabaseAPI"
import formidable from "formidable"
import fs from "fs"

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query } = req
  const userId = query.userId as string
  const profileId = await fetchProfileId(userId)

  if (!userId || !profileId) {
    return res.status(400).json({ error: "User ID or Profile ID is required" })
  }

  try {
    switch (method) {
      case "GET":
        const photos = await loadProfilePhotos(profileId)
        return res.status(200).json(photos)

      case "POST":
        const form = formidable({ multiples: false })
        const { fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>(
          (resolve, reject) => {
            form.parse(req, (err: any, fields: any, files: any) => {
              if (err) reject(err)
              resolve({ fields, files })
            })
          }
        )
        const file = Array.isArray(files.file) ? files.file[0] : files.file
        if (!file) {
          return res.status(400).json({ error: "No file provided" })
        }
        const isFirstPhoto = (fields.isFirstPhoto as unknown as string) === "true"
        const fileBuffer = fs.readFileSync(file.filepath)
        const fileName = file.originalFilename || `photo-${Date.now()}.jpg`
        const uploadedFile = new File([fileBuffer], fileName, { type: file.mimetype || "image/jpeg" })
        const publicUrl = await uploadPhoto(userId, profileId, uploadedFile, isFirstPhoto)
        return res.status(200).json({ publicUrl, message: "Photo uploaded successfully" })

      case "DELETE":
      case "PUT": {
        const buffers = []
        for await (const chunk of req) {
          buffers.push(chunk)
        }
        const data = Buffer.concat(buffers).toString()
        const body = JSON.parse(data)

        if (method === "DELETE") {
          const { storagePath } = body
          if (!storagePath) {
            return res.status(400).json({ error: "Storage path is required" })
          }
          await deletePhoto(profileId, userId, storagePath)
          return res.status(200).json({ message: "Photo deleted successfully" })
        }

        if (method === "PUT") {
          const { storagePath: primaryPath } = body
          if (!primaryPath) {
            return res.status(400).json({ error: "Storage path is required" })
          }
          const newPrimaryUrl = await setPrimaryPhoto(profileId, primaryPath)
          return res.status(200).json({ publicUrl: newPrimaryUrl, message: "Primary photo updated successfully" })
        }

        break
      }

      default:
        res.setHeader("Allow", ["GET", "POST", "DELETE", "PUT"])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error("[API Profile Photos] Error:", (error as Error).message)
    return res.status(500).json({ error: "Internal server error" })
  }
}
