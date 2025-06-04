"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useSignupForm } from "@/hooks/useSignupForm"
import { SignupFormValues } from "@/lib/validators/signupSchema"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react"
import { Controller } from "react-hook-form"

export function SignupForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useSignupForm()

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true)

    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
          },
        },
      })

      if (error || !signUpData?.user?.id) {
        throw error || new Error("Erro ao registrar o usuário")
      }

      const { error: profileError } = await supabase.from("profiles").insert([
        {
          user_id: signUpData.user.id,
          name: data.name,
          username: data.email.split("@")[0],
        },
      ])

      if (profileError) throw profileError

      toast({
        title: "Cadastro realizado!",
        description: "Verifique seu e-mail para confirmar a conta.",
      })

      router.push("/login")
    } catch (err: any) {
      toast({
        title: "Erro ao criar conta",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome completo</Label>
        <div className="relative">
          <User className="absolute left-3 top-3.5 h-5 w-5 text-neutral-400" />
          <Input id="name" placeholder="Seu nome" className="pl-10" {...register("name")} />
        </div>
        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3.5 h-5 w-5 text-neutral-400" />
          <Input id="email" placeholder="seu@email.com" className="pl-10" {...register("email")} />
        </div>
        {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3.5 h-5 w-5 text-neutral-400" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="pl-10"
            {...register("password")}
          />
          <button
            type="button"
            className="absolute right-3 top-3.5"
            aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3.5 h-5 w-5 text-neutral-400" />
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            className="pl-10"
            {...register("confirmPassword")}
          />
          <button
            type="button"
            className="absolute right-3 top-3.5"
            aria-label={showConfirmPassword ? "Esconder confirmação de senha" : "Mostrar confirmação de senha"}
            onClick={() => setShowConfirmPassword((v) => !v)}
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>}
      </div>

      <Controller
        name="acceptTerms"
        control={control}
        render={({ field }) => (
          <div className="flex items-start space-x-2 pt-2">
            <Checkbox
              id="acceptTerms"
              checked={field.value}
              onCheckedChange={field.onChange}
              className="data-[state=checked]:bg-oraculo-purple data-[state=checked]:border-oraculo-purple"
            />
            <label htmlFor="acceptTerms" className="text-sm text-neutral-600 leading-tight">
              Eu concordo com os{" "}
              <Link href="/terms" className="text-oraculo-purple hover:text-oraculo-cyan font-semibold">
                Termos de Uso
              </Link>{" "}
              e{" "}
              <Link href="/privacy" className="text-oraculo-purple hover:text-oraculo-cyan font-semibold">
                Política de Privacidade
              </Link>
            </label>
          </div>
        )}
      />
      {errors.acceptTerms && <p className="text-red-500 text-sm">{errors.acceptTerms.message}</p>}

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white hover:opacity-90"
        disabled={isLoading}
      >
        {isLoading ? "Criando conta..." : "Criar conta"}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </form>
  )
}
