"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { ProgressSteps } from "@/components/ui/progress-steps"
import { ProfilePhotoUpload } from "@/components/ui/profile-photo-upload"
import { motion } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [gender, setGender] = useState("HOMEM")
  const [birthDate, setBirthDate] = useState("")
  const [city, setCity] = useState("")
  const [contact, setContact] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)

  const handleComplete = () => {
    // Basic validation
    if (!birthDate) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe sua data de nascimento.",
        variant: "destructive",
      })
      return
    }

    if (!city) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe sua cidade atual.",
        variant: "destructive",
      })
      return
    }

    router.push("/onboarding/interests")
  }

  const handleBack = () => {
    router.push("/onboarding/welcome")
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

      <ProgressSteps steps={4} currentStep={1} />

      <motion.div className="flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <h3 className="text-2xl font-semibold gradient-text text-center mb-6">Seu Perfil</h3>

        <ProfilePhotoUpload className="mb-8" size="lg" onChange={setPhoto} />

        <div className="space-y-6">
          <div className="profile-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-oraculo-dark text-lg">Qual é o seu gênero?</p>
              <div className="flex items-center">
                <p className="text-oraculo-dark text-lg mr-4">{gender}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full border-oraculo-purple/50 bg-white text-oraculo-purple h-8 w-8"
                    onClick={() => setGender(gender === "HOMEM" ? "MULHER" : "HOMEM")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full border-oraculo-purple/50 bg-white text-oraculo-purple h-8 w-8"
                    onClick={() => setGender(gender === "HOMEM" ? "MULHER" : "HOMEM")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="profile-card p-4">
            <p className="text-oraculo-dark text-lg mb-2">Data de nascimento</p>
            <Input
              type="text"
              placeholder="DD/MM/AAAA"
              className="input-field"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>

          <div className="profile-card p-4">
            <p className="text-oraculo-dark text-lg mb-2">Cidade atual</p>
            <Input type="text" className="input-field" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>

          <div className="profile-card p-4">
            <p className="text-oraculo-dark text-lg mb-2">Seu contato</p>
            <Input
              type="text"
              className="input-field"
              placeholder="Email ou telefone"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
        </div>
      </motion.div>

      <Button className="w-full gradient-button h-14 mt-8" onClick={handleComplete}>
        Continuar
      </Button>
    </div>
  )
}

