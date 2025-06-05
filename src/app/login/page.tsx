"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Swal from "sweetalert2"
import withReactContent from "sweetalert2-react-content"
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import styles from "@/styles/Home.module.css"

const MySwal = withReactContent(Swal)

interface FormData {
  email: string
  password: string
}

interface FormInputProps {
  id: string
  name: string
  type: string
  placeholder: string
  icon: React.ReactNode
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  label: string
  required?: boolean
}

const FormInput: React.FC<FormInputProps> = ({
  id,
  name,
  type,
  placeholder,
  icon,
  value,
  onChange,
  label,
  required,
}) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <div className="relative">
      {icon}
      <Input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        className="auth-input pl-10 border-neutral-300 focus:ring-oraculo-purple"
        value={value}
        onChange={onChange}
        required={required}
        aria-label={`Digite seu ${label.toLowerCase()}`}
      />
    </div>
  </div>
)

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<FormData>({ email: "", password: "" })

  useEffect(() => {
    // Lazy-load video when in view
    const video = document.querySelector("video")
    if (video) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            video.play()
          } else {
            video.pause()
          }
        },
        { threshold: 0.1 }
      )
      observer.observe(video)
      return () => observer.disconnect()
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const showAlert = async (type: "success" | "error", title: string, text: string) => {
    return MySwal.fire({
      icon: type,
      title,
      text,
      customClass: {
        popup: "border-2 border-transparent bg-white rounded-xl",
        title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
        confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
      },
      willOpen: (popup) => {
        popup.setAttribute("aria-live", "assertive")
      },
    })
  }

  const validateForm = () => {
    if (!formData.email.includes("@") || !formData.email.includes(".")) {
      showAlert("error", "Email inválido", "Por favor, insira um email válido.")
      return false
    }
    if (formData.password.length < 6) {
      showAlert("error", "Senha inválida", "A senha deve ter pelo menos 6 caracteres.")
      return false
    }
    return true
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        const errorMessages: Record<string, string> = {
          "Invalid login credentials": "Email ou senha incorretos. Verifique e tente novamente.",
          "too_many_requests": "Muitas tentativas. Tente novamente em alguns minutos.",
          default: "Algo deu errado. Tente novamente.",
        }
        throw new Error(error.message)
      }

      await showAlert("success", "Login realizado!", "Redirecionando para sua conta...")
      router.push("/profile")
    } catch (error: any) {
      console.error("Login error:", error)
      await showAlert(
        "error",
        "Erro ao fazer login",
        error.message || "Algo deu errado. Tente novamente."
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Gradient topo */}
      <div className="bg-gradient-to-r from-oraculo-purple to-oraculo-cyan h-2" />

      {/* Loader fullscreen */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="fixed inset-0 bg-white z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Image
              src="/logo.png"
              alt="Logo"
              width={150}
              height={150}
              priority
              className="animate-pulse"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Parte esquerda */}
        <div className="hidden md:flex md:w-1/2 bg-pattern relative">
          <div className={styles.videoDocker}>
            <video
              className={styles.video}
              src="https://videos.pexels.com/video-files/8079132/8079132-uhd_2732_1440_25fps.mp4"
              autoPlay
              muted
              loop
              playsInline
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-oraculo-purple/90 via-oraculo-purple/80 to-oraculo-cyan/90" />
          <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
            <Image
              alt="Logo"
              src="/logo.png"
              height={150}
              width={150}
              priority
              className="mb-8"
            />
            <h1 className="text-4xl font-bold mb-4 text-center">Bem-vindo de volta!</h1>
            <p className="text-xl text-center max-w-md">
              Entre para continuar sua jornada de conexões autênticas.
            </p>
          </div>
        </div>

        {/* Parte direita */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-6">
          <div className="auth-card w-full max-w-md">
            <div className="flex justify-center mb-6 md:hidden">
              <Image
                alt="Logo"
                src="/logo.png"
                height={150}
                width={150}
                priority
                className="mb-8"
              />
            </div>

            <h2 className="text-oraculo-purple hover:text-oraculo-cyan text-2xl font-bold mb-6 text-center">
              Entrar na Plataforma
            </h2>

            <form onSubmit={handleLogin} className="space-y-4">
              <FormInput
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                icon={<Mail className="absolute left-3 top-3.5 h-5 w-5 text-neutral-400" />}
                value={formData.email}
                onChange={handleChange}
                label="Email"
                required
              />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link
                    href="/reset-password"
                    className="text-sm text-oraculo-purple hover:text-oraculo-cyan focus:ring-2 focus:ring-oraculo-purple focus:outline-none"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-neutral-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="auth-input pl-10 border-neutral-300 focus:ring-oraculo-purple"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    aria-label="Digite sua senha"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3.5 focus:ring-2 focus:ring-oraculo-purple focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-neutral-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-neutral-400" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white hover:opacity-90 focus:ring-2 focus:ring-oraculo-purple"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin h-4 w-4 mr-2"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="flex items-center my-6">
              <Separator className="flex-1" />
              <span className="px-3 text-neutral-500 text-sm">ou continue com</span>
              <Separator className="flex-1" />
            </div>

            <div className="text-center text-neutral-600">
              Não tem uma conta?{" "}
              <Link
                href="/signup"
                className="text-oraculo-purple hover:text-oraculo-cyan font-semibold focus:ring-2 focus:ring-oraculo-purple focus:outline-none"
              >
                Cadastre-se
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}