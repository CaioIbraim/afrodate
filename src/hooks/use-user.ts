'use client';
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export function useUser() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

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
          .select('*')
          .eq('user_id', session.user.id)
          .single()
        
        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError
        }
        
        setProfile(profileData || null)
      } catch (err) {
        console.error("Erro ao buscar usuário:", err)
        setError(err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUserAndProfile()
    
    // Configurar listener para mudanças de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
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