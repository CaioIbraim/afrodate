import { supabase } from "@/lib/supabase"
import { Profile, ProfileData, Preferences, Photo } from "@/lib/types"

export const generateUsername = async (name: string): Promise<string> => {
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

export const fetchProfileId = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.from("profiles").select("id").eq("user_id", userId).single()
    if (error && error.code !== "PGRST116") {
      throw new Error(`Erro ao carregar ID do perfil: ${error.message}`)
    }
    return data?.id || null
  } catch (error) {
    console.error("[fetchProfileId] Error:", (error as Error).message)
    throw error
  }
}

export const fetchProfile = async (profileId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, user_id, username, name, birth_date, gender, bio, city, profession, interests, avatar_url, latitude, longitude, whatsapp_number, share_whatsapp, gender_preference, min_age, max_age, max_distance, show_profile, match_notifications, message_notifications, created_at, updated_at"
      )
      .eq("id", profileId)
      .single()
    if (error) {
      throw new Error(`Erro ao carregar perfil: ${error.message}`)
    }
    return data || null
  } catch (error) {
    console.error("[fetchProfile] Error:", (error as Error).message)
    throw error
  }
}

export const loadProfilePhotos = async (profileId: string): Promise<Photo[]> => {
  try {
    const { data: photosData, error: photosError } = await supabase
      .from("profile_photos")
      .select("storage_path, is_primary")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: true })
    if (photosError) {
      throw new Error(`Erro ao carregar fotos: ${photosError.message}`)
    }
    const photoUrls = await Promise.all(
      photosData.map(async (photo: { storage_path: string; is_primary: boolean }) => {
        const { data: publicUrlData } = supabase.storage.from("imagens").getPublicUrl(photo.storage_path)
        let url = publicUrlData.publicUrl
        try {
          const response = await fetch(url, { method: "HEAD" })
          if (!response.ok) throw new Error("Public URL inaccessible")
        } catch {
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from("imagens")
            .createSignedUrl(photo.storage_path, 3600)
          if (signedUrlError) throw signedUrlError
          url = signedUrlData.signedUrl
        }
        return {
          name: photo.storage_path.split("/").pop()!,
          storage_path: photo.storage_path,
          publicUrl: url,
          isPrimary: photo.is_primary,
        }
      })
    )
    return photoUrls
  } catch (error) {
    console.error("[loadProfilePhotos] Error:", (error as Error).message)
    throw error
  }
}

export const createProfile = async (
  userId: string,
  profileData: ProfileData,
  username: string
): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        user_id: userId,
        username,
        name: profileData.name,
        birth_date: profileData.birth_date,
        gender: profileData.gender,
        bio: profileData.bio,
        city: profileData.city,
        profession: profileData.profession,
        interests: profileData.interests,
        latitude: profileData.latitude,
        longitude: profileData.longitude,
        whatsapp_number: profileData.whatsapp_number || null,
        share_whatsapp: profileData.share_whatsapp ?? false,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()
    if (error) {
      throw new Error(`Erro ao criar perfil: ${error.message}`)
    }
    return data.id
  } catch (error) {
    console.error("[createProfile] Error:", (error as Error).message)
    throw error
  }
}

export const updateProfile = async (
  profileId: string,
  profileData: ProfileData,
  avatarUrl: string | null
): Promise<void> => {
  try {
    const username = await generateUsername(profileData.name)
    const { error } = await supabase
      .from("profiles")
      .update({
        name: profileData.name,
        birth_date: profileData.birth_date,
        gender: profileData.gender,
        bio: profileData.bio,
        city: profileData.city,
        profession: profileData.profession,
        interests: profileData.interests,
        latitude: profileData.latitude,
        longitude: profileData.longitude,
        whatsapp_number: profileData.whatsapp_number || null,
        share_whatsapp: profileData.share_whatsapp ?? false,
        avatar_url: avatarUrl,
        username,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId)
    if (error) {
      throw new Error(`Erro ao atualizar perfil: ${error.message}`)
    }
  } catch (error) {
    console.error("[updateProfile] Error:", (error as Error).message)
    throw error
  }
}

export const updatePreferences = async (profileId: string, preferences: Preferences): Promise<void> => {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        gender_preference: preferences.genderPreference,
        min_age: preferences.minAge,
        max_age: preferences.maxAge,
        max_distance: preferences.maxDistance,
        show_profile: preferences.showProfile,
        match_notifications: preferences.matchNotifications,
        message_notifications: preferences.messageNotifications,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId)
    if (error) {
      throw new Error(`Erro ao salvar preferências: ${error.message}`)
    }
  } catch (error) {
    console.error("[updatePreferences] Error:", (error as Error).message)
    throw error
  }
}

export const uploadPhoto = async (
  userId: string,
  profileId: string,
  file: File,
  isFirstPhoto: boolean
): Promise<string> => {
  try {
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
    const filePath = `${userId}/${fileName}`
    const { error: uploadError } = await supabase.storage
      .from("imagens")
      .upload(filePath, file, { contentType: file.type, upsert: false })
    if (uploadError) {
      throw new Error(`Erro ao fazer upload da foto: ${uploadError.message}`)
    }
    if (!isFirstPhoto) {
      await supabase
        .from("profile_photos")
        .update({ is_primary: false })
        .eq("profile_id", profileId)
        .eq("is_primary", true)
    }
    const { error: insertError } = await supabase.from("profile_photos").insert({
      profile_id: profileId,
      storage_path: filePath,
      is_primary: isFirstPhoto,
    })
    if (insertError) {
      await supabase.storage.from("imagens").remove([filePath])
      throw new Error(`Erro ao inserir foto no banco: ${insertError.message}`)
    }
    const { data: urlData } = supabase.storage.from("imagens").getPublicUrl(filePath)
    return urlData.publicUrl
  } catch (error) {
    console.error("[uploadPhoto] Error:", (error as Error).message)
    throw error
  }
}

export const deletePhoto = async (profileId: string, userId: string, filePath: string): Promise<void> => {
  try {
    const { data: photoData, error: photoError } = await supabase
      .from("profile_photos")
      .select("is_primary")
      .eq("storage_path", filePath)
      .eq("profile_id", profileId)
      .single()
    if (photoError) {
      throw new Error(`Erro ao buscar foto: ${photoError.message}`)
    }
    const { error: deleteError } = await supabase.storage.from("imagens").remove([filePath])
    if (deleteError) {
      throw new Error(`Erro ao deletar foto: ${deleteError.message}`)
    }
    const { error: dbError } = await supabase
      .from("profile_photos")
      .delete()
      .eq("storage_path", filePath)
      .eq("profile_id", profileId)
    if (dbError) {
      throw new Error(`Erro ao remover foto do banco: ${dbError.message}`)
    }
    if (photoData.is_primary) {
      const { data: remainingPhotos } = await supabase
        .from("profile_photos")
        .select("storage_path")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: true })
        .limit(1)
      if (remainingPhotos && remainingPhotos.length > 0) {
        const { error: updatePrimaryError } = await supabase
          .from("profile_photos")
          .update({ is_primary: true })
          .eq("storage_path", remainingPhotos[0].storage_path)
          .eq("profile_id", profileId)
        if (updatePrimaryError) {
          throw new Error(`Erro ao atualizar foto principal: ${updatePrimaryError.message}`)
        }
        const { data: publicUrl } = supabase.storage.from("imagens").getPublicUrl(remainingPhotos[0].storage_path)
        const { error: avatarError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl.publicUrl })
          .eq("id", profileId)
        if (avatarError) {
          throw new Error(`Erro ao atualizar avatar: ${avatarError.message}`)
        }
      } else {
        const { error: avatarError } = await supabase
          .from("profiles")
          .update({ avatar_url: null })
          .eq("id", profileId)
        if (avatarError) {
          throw new Error(`Erro ao resetar avatar: ${avatarError.message}`)
        }
      }
    }
  } catch (error) {
    console.error("[deletePhoto] Error:", (error as Error).message)
    throw error
  }
}

export const setPrimaryPhoto = async (profileId: string, storagePath: string): Promise<string> => {
  try {
    await supabase.from("profile_photos").update({ is_primary: false }).eq("profile_id", profileId)
    const { error: updateError } = await supabase
      .from("profile_photos")
      .update({ is_primary: true })
      .eq("storage_path", storagePath)
      .eq("profile_id", profileId)
    if (updateError) {
      throw new Error(`Erro ao definir foto principal: ${updateError.message}`)
    }
    const { data: publicUrl } = supabase.storage.from("imagens").getPublicUrl(storagePath)
    const { error: avatarError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl.publicUrl })
      .eq("id", profileId)
    if (avatarError) {
      throw new Error(`Erro ao atualizar avatar: ${avatarError.message}`)
    }
    return publicUrl.publicUrl
  } catch (error) {
    console.error("[setPrimaryPhoto] Error:", (error as Error).message)
    throw error
  }
}

export const signOut = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(`Erro ao fazer logout: ${error.message}`)
    }
  } catch (error) {
    console.error("[signOut] Error:", (error as Error).message)
    throw error
  }
}