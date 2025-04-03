"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ChevronLeft } from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { ProgressSteps } from "@/components/ui/progress-steps"
import { motion } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"
import { LocationSelector, popularLocations } from "@/components/ui/location-selector"

export default function LocationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])

  const handleComplete = () => {
    if (selectedLocations.length < 2) {
      toast({
        title: "Selecione mais locais",
        description: "Por favor, selecione pelo menos 2 locais preferidos.",
        variant: "destructive",
      })
      return
    }

    // Em um app real, salvaríamos esses dados
    // Aqui apenas simulamos o fluxo
    router.push("/questionnaire")
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

      <ProgressSteps steps={4} currentStep={3} />

      <motion.div className="flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <h3 className="text-2xl font-semibold gradient-text text-center mb-2">Seus Lugares Favoritos</h3>
        <p className="text-oraculo-muted text-center mb-6">Selecione de 2 a 5 locais que você gosta de frequentar</p>

        <div className="profile-card p-4 mb-6">
          <h4 className="text-oraculo-dark text-lg mb-4">Onde você gosta de passar seu tempo?</h4>
          <LocationSelector selectedLocations={selectedLocations} onChange={setSelectedLocations} maxSelections={5} />
        </div>

        <div className="profile-card p-4 mb-6">
          <h4 className="text-oraculo-dark text-lg mb-3">Por que isso é importante?</h4>
          <p className="text-oraculo-muted">
            Conhecer seus lugares favoritos nos ajuda a encontrar pessoas com interesses semelhantes que frequentam os
            mesmos ambientes que você.
          </p>
        </div>

        {selectedLocations.length > 0 && (
          <div className="profile-card p-4">
            <h4 className="text-oraculo-dark text-lg mb-3">Seus locais selecionados:</h4>
            <ul className="space-y-2">
              {selectedLocations.map((location) => {
                const locationData = popularLocations.find((l) => l.value === location)
                return (
                  <li key={location} className="text-oraculo-muted flex items-center">
                    <span className="w-2 h-2 bg-gradient-to-r from-oraculo-purple to-oraculo-cyan rounded-full mr-2"></span>
                    {locationData?.label}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </motion.div>

      <Button className="w-full gradient-button h-14 mt-8" onClick={handleComplete}>
        Continuar
      </Button>
    </div>
  )
}

