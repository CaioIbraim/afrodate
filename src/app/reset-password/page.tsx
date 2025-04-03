"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, ArrowLeft, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { VivaLogo } from "@/components/viva-logo"

export default function ResetPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })

      if (error) throw error

      setIsSubmitted(true)
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      })
    } catch (error: any) {
      console.error("Password reset error:", error)
      toast({
        title: "Erro ao enviar email",
        description: error.message || "Ocorreu um erro ao tentar enviar o email de recuperação. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with gradient */}
      <div className="auth-gradient h-2" />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="auth-card max-w-md w-full">
          <div className="flex justify-center mb-6">
            <VivaLogo className="w-24 h-24" />
          </div>

          {!isSubmitted ? (
            <>
              <h2 className="text-2xl font-bold mb-2 text-center">Recuperar Senha</h2>
              <p className="text-neutral-600 text-center mb-6">
                Digite seu email e enviaremos instruções para redefinir sua senha.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-neutral-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="auth-input pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="auth-button w-full bg-amber-500 hover:bg-amber-600 text-black"
                  disabled={isLoading}
                >
                  {isLoading ? "Enviando..." : "Enviar instruções"}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Email enviado!</h2>
              <p className="text-neutral-600 mb-6">
                Enviamos instruções para redefinir sua senha para {email}. Verifique sua caixa de entrada e siga as
                instruções.
              </p>
              <p className="text-sm text-neutral-500 mb-4">
                Não recebeu o email? Verifique sua pasta de spam ou{" "}
                <button
                  className="text-amber-600 hover:text-amber-700 font-semibold"
                  onClick={() => setIsSubmitted(false)}
                >
                  tente novamente
                </button>
              </p>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/login" className="inline-flex items-center text-amber-600 hover:text-amber-700 font-semibold">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

