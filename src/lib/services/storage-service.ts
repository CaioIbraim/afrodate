import { supabase } from '@/lib/supabase'

export class StorageService {
  static async uploadProfileImage(file: File, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `profile-images/${fileName}`

    const { data, error } = await supabase.storage
      .from('profiles')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('profiles')
      .getPublicUrl(filePath)

    return publicUrl
  }

  static async deleteProfileImage(imageUrl: string): Promise<void> {
    const path = imageUrl.split('/').pop()
    if (!path) return

    const { error } = await supabase.storage
      .from('profiles')
      .remove([`profile-images/${path}`])

    if (error) throw error
  }
}