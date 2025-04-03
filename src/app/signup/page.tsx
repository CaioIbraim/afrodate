"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { VivaLogo } from "@/components/viva-logo"
import { EnvironmentCheck } from "@/components/environment-check"
import { AuthService } from "@/lib/services/auth-service"

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  })
  const [envError, setEnvError] = useState(false)

  // Verificar variáveis de ambiente no carregamento da página
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setEnvError(true)
      toast({
        title: "Erro de configuração",
        description: "As variáveis de ambiente do Supabase não estão configuradas corretamente.",
        variant: "destructive",
      })
    }
  }, [toast])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, acceptTerms: checked }))
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (envError) {
      toast({
        title: "Configuração incompleta",
        description: "A autenticação não está disponível devido a erros de configuração.",
        variant: "destructive",
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "As senhas não coincidem",
        description: "Por favor, verifique se as senhas são iguais.",
        variant: "destructive",
      })
      return
    }

    if (!formData.acceptTerms) {
      toast({
        title: "Termos não aceitos",
        description: "Você precisa aceitar os termos de uso para continuar.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          },
        },
      })

      if (error) throw error

      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Verifique seu email para confirmar sua conta.",
      })

      router.push("/login")
    } catch (error: any) {
      console.error("Signup error:", error)
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Ocorreu um erro ao tentar criar sua conta. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialSignup = async (provider: "google" | "facebook") => {
    if (envError) {
      toast({
        title: "Configuração incompleta",
        description: "A autenticação não está disponível devido a erros de configuração.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      await AuthService.loginWithProvider(provider, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Redirecionando para sua conta...",
      })
      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description:
          error.message || "Ocorreu um erro ao tentar criar sua conta com " + provider + ". Tente novamente.",
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

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left side - Decorative */}
        <div className="hidden md:flex md:w-1/2 bg-pattern relative">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/90 via-amber-500/80 to-green-600/90" />

          <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
            <VivaLogo className="w-48 h-48 mb-8" />

            <h1 className="text-4xl font-bold mb-4 text-center">Junte-se à Viva Afro</h1>

            <p className="text-xl text-center max-w-md">
              Crie sua conta e comece a celebrar a cultura afro enquanto encontra conexões autênticas.
            </p>
          </div>
        </div>

        {/* Right side - Signup form */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-6">
          <div className="auth-card">
            <div className="flex justify-center mb-6 md:hidden">
              <VivaLogo className="w-24 h-24" />
            </div>

            <h2 className="text-2xl font-bold mb-6 text-center">Criar uma conta</h2>

            {/* Verificação de ambiente */}
            <EnvironmentCheck />

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-5 w-5 text-neutral-400" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Seu nome"
                    className="auth-input pl-10"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-neutral-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="auth-input pl-10"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-neutral-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="auth-input pl-10"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3.5"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-neutral-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-neutral-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-neutral-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="auth-input pl-10"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3.5"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-neutral-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-neutral-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="terms"
                  checked={formData.acceptTerms}
                  onCheckedChange={handleCheckboxChange}
                  className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <label htmlFor="terms" className="text-sm text-neutral-600 leading-tight">
                  Eu concordo com os{" "}
                  <Link href="/terms" className="text-amber-600 hover:text-amber-700 font-semibold">
                    Termos de Uso
                  </Link>{" "}
                  e{" "}
                  <Link href="/privacy" className="text-amber-600 hover:text-amber-700 font-semibold">
                    Política de Privacidade
                  </Link>
                </label>
              </div>

              <Button
                type="submit"
                className="auth-button w-full bg-amber-500 hover:bg-amber-600 text-black"
                disabled={isLoading || envError}
              >
                {isLoading ? "Criando conta..." : "Criar conta"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="flex items-center my-6">
              <Separator className="flex-1" />
              <span className="px-3 text-neutral-500 text-sm">ou continue com</span>
              <Separator className="flex-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className="social-button"
                onClick={() => handleSocialSignup("google")}
                disabled={isLoading || envError}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuar com Google
              </button>

              <button
                type="button"
                className="social-button"
                onClick={() => handleSocialSignup("facebook")}
                disabled={isLoading || envError}
              >
                <svg className="w-5 h-5 text-[#1877f2]" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M20.9 2H3.1A1.1 1.1 0 0 0 2 3.1v17.8A1.1 1.1 0 0 0 3.1 22h9.58v-7.75h-2.6v-3h2.6V9a3.64 3.64 0 0 1 3.88-4 20.26 20.26 0 0 1 2.33.12v2.7H17.3c-1.26 0-1.5.6-1.5 1.47v1.93h3l-.39 3H15.8V22h5.1a1.1 1.1 0 0 0 1.1-1.1V3.1A1.1 1.1 0 0 0 20.9 2Z"
                  />
                </svg>
                Facebook
              </button>
            </div>

            <p className="mt-8 text-center text-neutral-600">
              Já tem uma conta?{" "}
              <Link href="/login" className="text-amber-600 hover:text-amber-700 font-semibold">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

