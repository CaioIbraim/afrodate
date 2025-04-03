"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ChevronLeft } from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { ProgressSteps } from "@/components/ui/progress-steps"
import { motion } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"
import type { GenderPreference } from "@/lib/types"

export default function GenderPreferencePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [genderPreference, setGenderPreference] = useState<GenderPreference>("TODOS")

  const handleComplete = () => {
    // Em um app real, salvaríamos esses dados
    // Aqui apenas simulamos o fluxo
    router.push("/onboarding/locations")
  }

  const handleBack = () => {
    router.push("/onboarding/interests")
  }

  return (
    <div className="app-container">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" className="text-oraculo-muted" onClick={handleBack}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Logo size="sm" />
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      <ProgressSteps steps={5} currentStep={3} />

      <motion.div className="flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <h3 className="text-2xl font-semibold gradient-text text-center mb-2">Suas Preferências</h3>
        <p className="text-oraculo-muted text-center mb-6">Quem você gostaria de conhecer?</p>

        <div className="space-y-4">
          <div
            className={`profile-card p-4 cursor-pointer transition-all ${
              genderPreference === "HOMEM" ? "border-2 border-oraculo-purple" : "hover:border-oraculo-purple/50"
            }`}
            onClick={() => setGenderPreference("HOMEM")}
          >
            <div className="flex items-center">
              <div
                className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                  genderPreference === "HOMEM" ? "border-oraculo-purple bg-oraculo-purple/10" : "border-oraculo-muted"
                }`}
              >
                {genderPreference === "HOMEM" && <div className="w-3 h-3 rounded-full bg-oraculo-purple" />}
              </div>
              <h4 className="text-oraculo-dark text-lg">Homens</h4>
            </div>
          </div>

          <div
            className={`profile-card p-4 cursor-pointer transition-all ${
              genderPreference === "MULHER" ? "border-2 border-oraculo-purple" : "hover:border-oraculo-purple/50"
            }`}
            onClick={() => setGenderPreference("MULHER")}
          >
            <div className="flex items-center">
              <div
                className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                  genderPreference === "MULHER" ? "border-oraculo-purple bg-oraculo-purple/10" : "border-oraculo-muted"
                }`}
              >
                {genderPreference === "MULHER" && <div className="w-3 h-3 rounded-full bg-oraculo-purple" />}
              </div>
              <h4 className="text-oraculo-dark text-lg">Mulheres</h4>
            </div>
          </div>

          <div
            className={`profile-card p-4 cursor-pointer transition-all ${
              genderPreference === "TODOS" ? "border-2 border-oraculo-purple" : "hover:border-oraculo-purple/50"
            }`}
            onClick={() => setGenderPreference("TODOS")}
          >
            <div className="flex items-center">
              <div
                className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                  genderPreference === "TODOS" ? "border-oraculo-purple bg-oraculo-purple/10" : "border-oraculo-muted"
                }`}
              >
                {genderPreference === "TODOS" && <div className="w-3 h-3 rounded-full bg-oraculo-purple" />}
              </div>
              <h4 className="text-oraculo-dark text-lg">Todos</h4>
            </div>
          </div>
        </div>

        <div className="profile-card p-4 mt-6">
          <h4 className="text-oraculo-dark text-lg mb-3">Por que isso é importante?</h4>
          <p className="text-oraculo-muted">
            Suas preferências nos ajudam a mostrar perfis mais relevantes para você. Você poderá alterar essa
            configuração a qualquer momento nas configurações do seu perfil.
          </p>
        </div>
      </motion.div>

      <Button className="w-full gradient-button h-14 mt-8" onClick={handleComplete}>
        Continuar
      </Button>
    </div>
  )
}

