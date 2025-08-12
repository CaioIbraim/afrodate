import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

// Helper functions (unchanged)
async function generateUniqueUsername(supabase: any, base: string): Promise<string> {
  const randomStr = Math.random().toString(36).substring(2, 8)
  let username = `${base}_${randomStr}`
  let attempts = 0
  const maxAttempts = 5

  while (attempts < maxAttempts) {
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .single()

    if (error && error.code !== "PGRST116") {
      throw new Error("Erro ao verificar username: " + error.message)
    }
    if (!data) {
      return username
    }
    username = `${base}_${Math.random().toString(36).substring(2, 8)}`
    attempts++
  }
  throw new Error("Não foi possível gerar um username único após várias tentativas.")
}

async function createProfile(supabase: any, userId: string, email: string, name?: string) {
  const baseName = name || email.split("@")[0] || "user"
  const username = await generateUniqueUsername(supabase, baseName)
  const profileId = uuidv4()

  const { error } = await supabase.from("profiles").insert({
    id: profileId,
    user_id: userId,
    name: name || baseName,
    username,
  })

  if (error) {
    throw new Error("Erro ao criar perfil: " + error.message)
  }
  return profileId
}

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.delete({ name, ...options })
        },
      },
    }
  )

  const { searchParams, hash, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  let next = searchParams.get('next') ?? '/discover/v6'
  if (!next.startsWith('/')) next = '/discover/v6'

  // Enhanced logging for debugging
  console.log('Callback received:', {
    url: request.url,
    code,
    error,
    errorDescription,
    hash,
    searchParams: Object.fromEntries(searchParams),
  })

  if (error) {
    console.error('OAuth provider error:', { error, errorDescription })
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(
        errorDescription || 'Erro desconhecido'
      )}`
    )
  }

  if (code) {
    try {
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      if (sessionError) {
        console.error('Error exchanging code for session:', sessionError)
        throw new Error(sessionError.message)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuário não encontrado após troca de código.')
      }

      console.log('User authenticated:', { userId: user.id, email: user.email })

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      let profileId: string
      if (!profile) {
        profileId = await createProfile(
          supabase,
          user.id,
          user.email || '',
          user.user_metadata?.full_name || user.user_metadata?.name
        )
        console.log('Profile created:', { profileId })
      } else {
        profileId = profile.id
        console.log('Profile exists:', { profileId })
      }

      const { data: interests } = await supabase
        .from('profile_interests')
        .select('id')
        .eq('profile_id', profileId)

      if (interests?.length === 0) {
        console.log('No interests found, redirecting to /interests')
        return NextResponse.redirect(`${origin}/interests`)
      } else {
        console.log('Interests found, redirecting to /discover/v6')
        return NextResponse.redirect(`${origin}/discover/v6`)
      }
    } catch (err: any) {
      console.error('Callback error:', err)
      return NextResponse.redirect(
        `${origin}/login?error=auth-code-error&error_description=${encodeURIComponent(
          err.message || 'Erro ao processar autenticação'
        )}`
      )
    }
  }

  // Handle unexpected tokens in fragment
  if (hash) {
    console.warn('Unexpected tokens in URL fragment:', hash)
    return NextResponse.redirect(
      `${origin}/login?error=invalid-response&error_description=Recebido-token-no-fragmento`
    )
  }

  // Default error case
  console.error('No code provided in callback')
  return NextResponse.redirect(
    `${origin}/login?error=auth-code-error&error_description=Nenhum-código-de-autorização-fornecido`
  )
}