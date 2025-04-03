"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Logo } from "@/components/ui/logo"
import { motion } from "framer-motion"
import { Heart } from "lucide-react"

export default function WelcomePage() {
  const router = useRouter()

  const handleStart = () => {
    router.push("/onboarding/profile")
  }

  return (
    <div className="app-container justify-between">
      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center bg-white p-6 rounded-2xl shadow-md"
        >
          <Logo size="md" />

          <div className="mt-12 mb-8 relative">
            <Heart
              className="text-oraculo-pink w-24 h-24 mx-auto animate-pulse-soft"
              style={{ animationDuration: "3s" }}
            />
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
            <h3 className="text-2xl font-semibold gradient-text mb-4">Bem-vindo ao Oráculo</h3>
            <p className="text-oraculo-muted mb-6 max-w-xs mx-auto">
              Estamos prestes a iniciar uma jornada para encontrar sua alma gêmea. Vamos criar seu perfil e descobrir
              suas preferências.
            </p>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="w-full"
      >
        <Button className="w-full gradient-button h-14 text-lg" onClick={handleStart}>
          Começar
        </Button>
      </motion.div>
    </div>
  )
}

