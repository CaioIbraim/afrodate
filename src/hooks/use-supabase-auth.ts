import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AuthService } from '@/lib/services/auth-service'

export function useSupabaseAuth() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const authService = AuthService.getInstance()

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Integrate with existing auth service
      if (data.session) {
        await authService.login(email, password)
        router.push('/discover')
      }
    } catch (err) {
      console.error("Sign-in error:", err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const signUpWithEmail = async (email: string, password: string, userData: {
    name: string
    age: number
    gender: string
  }) => {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })

      if (error) throw error

      // Integrate with existing auth service
      if (data.user) {
        await authService.register({
          email,
          password,
          ...userData
        })
        router.push('/onboarding/welcome')

        // Send welcome email
        await supabase.functions.invoke('send-welcome-email', {
          body: { email, name: userData.name },
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const signInWithProvider = async (provider: 'google' | 'facebook') => {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase.auth.signInWithOAuth({ provider })
      if (error || !data?.url) throw error || new Error('Provider login failed')

      // Redirect the user to the provider's authentication URL
      window.location.href = data.url
    } catch (err) {
      console.error("Provider sign-in error:", err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const recoverPassword = async (email: string) => {
    try {
      setLoading(true)
      setError(null)
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error

      // Send recovery email
      await supabase.functions.invoke('send-recovery-email', {
        body: { email },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      await authService.logout()
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    signInWithEmail,
    signUpWithEmail,
    signInWithProvider,
    recoverPassword,
    signOut,
  }
}