'use client';
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"

type Profile = {
  id: string;
  user_id: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  [key: string]: any;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        setIsLoading(true)
        
        // Obter usuário atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          throw sessionError
        }
        
        if (!session) {
          setUser(null)
          setProfile(null)
          return
        }
        
        setUser(session.user)
        
        // Obter perfil do usuário
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*, profile_photos(*), profile_interests(*)')
          .eq('user_id', session.user.id)
          .single()
        
        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError
        }
        
        setProfile(profileData || null)
      } catch (err) {
        console.log("Erro ao buscar usuário:", err)
        setError(err as Error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUserAndProfile()
    
    // Configurar listener para mudanças de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        setUser(session.user)
        
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
        
        setProfile(data)
      }
      
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
      }
    })
    
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])
  
  return { user, profile, isLoading, error }
}

export const refreshProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, profile_photos(*), profile_interests(*)')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    setProfile(data || null)
    return data
  } catch (err) {
    console.error("Error refreshing profile:", err)
    setError(err as Error)
    return null
  }
}
