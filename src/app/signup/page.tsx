"use client"

import Image from "next/image"
import { VivaLogo } from "@/components/viva-logo"
import { Separator } from "@/components/ui/separator"
import { SignupForm } from "@/components/auth/SignupForm"
import { EnvironmentCheck } from "@/components/environment-check"
import styles from "@/styles/Home.module.css"

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Linha roxa no topo */}
      <div className="bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] h-2" />

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Lado esquerdo com vídeo */}
        <div className="hidden md:flex md:w-1/2 bg-pattern relative">
          <div className={styles.videoDocker}>
            <video
              className={styles.video}
              src="/video/video.mp4"
              autoPlay
              muted
              loop
            ></video>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-oraculo-cyan/80 from-oraculo-cyan/70  to-[#00FFD1]/80" />

          <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
            <Image alt="Logo" src="/logo.png" height={150} width={150} className=" mb-8" />
            <h1 className="text-4xl font-bold mb-4 text-center">Junte-se a nós</h1>
            <p className="text-xl text-center max-w-md">
              Crie sua conta e comece a celebrar a cultura afro enquanto encontra conexões autênticas.
            </p>
          </div>
        </div>

        {/* Lado direito com o formulário */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-6">
          <div className="auth-card w-full max-w-md">
            <div className="flex justify-center mb-6 md:hidden">
              <Image alt="Logo" src="/logo.png" height={150} width={150} className="mb-8" />
            </div>

            <h2 className="text-[#00FFD1] hover:text-oraculo-cyan text-2xl font-bold mb-6 text-center">
              Criar uma conta
            </h2>

            {/* Verificação de ambiente */}
            <EnvironmentCheck />

            {/* Formulário de cadastro */}
            <SignupForm />

            <div className="flex items-center my-6">
              <Separator className="flex-1" />
              <span className="px-3 text-neutral-500 text-sm">ou continue com</span>
              <Separator className="flex-1" />
            </div>

            {/* Botões sociais podem ser extraídos também */}
            {/* <SocialLoginButtons /> */}

            <p className="mt-8 text-center text-neutral-600">
              Já tem uma conta?{" "}
              <a href="/login" className="text-[#00FFD1] hover:text-oraculo-cyan font-semibold">
                Entrar
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
