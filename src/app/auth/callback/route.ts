import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error("Error exchanging code for session:", error)
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
      }
    } catch (err) {
      console.error("Unexpected error during code exchange:", err)
      return NextResponse.redirect(new URL(`/login?error=Unexpected error`, requestUrl.origin))
    }
  }

  // Redireciona para o dashboard após o login bem-sucedido
  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin))
}

