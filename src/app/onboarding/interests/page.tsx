"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ChevronLeft } from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { ProgressSteps } from "@/components/ui/progress-steps"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

const interestCategories = [
  {
    name: "Música",
    options: ["Rock", "Pop", "Jazz", "Clássica", "Hip-Hop", "Eletrônica", "Samba", "Forró", "Folk", "R&B"],
  },
  {
    name: "Filmes",
    options: [
      "Ação",
      "Comédia",
      "Drama",
      "Romance",
      "Terror",
      "Ficção Científica",
      "Aventura",
      "Animação",
      "Documentário",
      "Musical",
    ],
  },
  {
    name: "Hobbies",
    options: [
      "Leitura",
      "Esportes",
      "Viagens",
      "Culinária",
      "Fotografia",
      "Jogos",
      "Dança",
      "Arte",
      "Tecnologia",
      "Natureza",
    ],
  },
]

export default function InterestsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

  const handleToggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest))
    } else {
      if (selectedInterests.length >= 5) {
        toast({
          title: "Limite atingido",
          description: "Você pode selecionar no máximo 5 interesses.",
          variant: "destructive",
        })
        return
      }
      setSelectedInterests([...selectedInterests, interest])
    }
  }

  const handleComplete = () => {
    if (selectedInterests.length < 3) {
      toast({
        title: "Selecione mais interesses",
        description: "Por favor, selecione pelo menos 3 interesses.",
        variant: "destructive",
      })
      return
    }

    router.push("/onboarding/locations")
  }

  const handleBack = () => {
    router.push("/onboarding/profile")
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

      <ProgressSteps steps={4} currentStep={2} />

      <motion.div className="flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <h3 className="text-2xl font-semibold gradient-text text-center mb-2">Seus Interesses</h3>
        <p className="text-oraculo-muted text-center mb-6">Selecione de 3 a 5 interesses</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {selectedInterests.map((interest) => (
            <Badge
              key={interest}
              className="bg-gradient-to-r from-oraculo-purple to-oraculo-cyan hover:from-oraculo-purple hover:to-oraculo-cyan text-white"
              onClick={() => handleToggleInterest(interest)}
            >
              {interest}
            </Badge>
          ))}
        </div>

        <div className="space-y-6">
          {interestCategories.map((category) => (
            <div key={category.name} className="profile-card p-4">
              <h4 className="text-oraculo-dark text-lg mb-3">{category.name}</h4>
              <div className="flex flex-wrap gap-2">
                {category.options.map((option) => (
                  <Badge
                    key={option}
                    variant={selectedInterests.includes(option) ? "default" : "outline"}
                    className={
                      selectedInterests.includes(option)
                        ? "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white cursor-pointer"
                        : "border-oraculo-purple/50 text-oraculo-purple hover:bg-oraculo-purple/20 cursor-pointer"
                    }
                    onClick={() => handleToggleInterest(option)}
                  >
                    {option}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <Button className="w-full gradient-button h-14 mt-8" onClick={handleComplete}>
        Continuar
      </Button>
    </div>
  )
}

