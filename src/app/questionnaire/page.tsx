"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Logo } from "@/components/ui/logo"
import { motion, AnimatePresence } from "framer-motion"
import { Hourglass } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// Perguntas com foco em conhecimentos afrodiaspóricos
const questions = [
  {
    id: 1,
    question: "Qual expressão cultural de origem africana mais te conecta?",
    options: [
      "Música (Samba, Jazz, Blues, Hip-Hop)",
      "Dança (Jongo, Maracatu, Afoxé)",
      "Culinária (Acarajé, Vatapá, Moqueca)",
      "Religiosidade (Candomblé, Umbanda)",
      "Artes visuais e estéticas",
      "Literatura e poesia",
      "Filosofias e saberes ancestrais",
      "Moda e estética corporal",
      "Capoeira e artes marciais",
      "Festivais e celebrações",
    ],
  },
  {
    id: 2,
    question: "Qual destes ritmos musicais de origem africana mais te representa?",
    options: [
      "Samba e suas variações",
      "Jazz e Blues",
      "Hip-Hop e Rap",
      "Afrobeat e Afrofunk",
      "Reggae e Dub",
      "R&B e Soul",
      "Funk brasileiro",
      "Maracatu e Afoxé",
      "Jongo e Congada",
      "MPB com influências africanas",
    ],
  },
  {
    id: 3,
    question: "Qual destas personalidades negras mais te inspira?",
    options: [
      "Zumbi dos Palmares e Dandara",
      "Nina Simone e Billie Holiday",
      "Machado de Assis e Lima Barreto",
      "Angela Davis e Malcolm X",
      "Conceição Evaristo e Djamila Ribeiro",
      "Nelson Mandela e Winnie Mandela",
      "Beyoncé e Rihanna",
      "Carolina Maria de Jesus e Lélia Gonzalez",
      "Milton Santos e Abdias do Nascimento",
      "Marielle Franco e Sueli Carneiro",
    ],
  },
  {
    id: 4,
    question: "Como você se conecta com suas raízes ancestrais?",
    options: [
      "Através da música e dança",
      "Pela culinária e gastronomia",
      "Estudando história e literatura",
      "Participando de rituais e celebrações",
      "Através da estética e moda",
      "Pelo ativismo e engajamento social",
      "Mantendo tradições familiares",
      "Viajando para conhecer lugares de origem",
      "Aprendendo idiomas ancestrais",
      "Através da espiritualidade",
    ],
  },
  {
    id: 5,
    question: "Qual aspecto da diáspora africana você gostaria de explorar mais em um relacionamento?",
    options: [
      "Conhecimento histórico e cultural",
      "Culinária e tradições gastronômicas",
      "Música, dança e expressões artísticas",
      "Espiritualidade e filosofias ancestrais",
      "Estética, moda e expressão corporal",
      "Ativismo e consciência política",
      "Viagens para destinos da diáspora",
      "Celebrações e festivais tradicionais",
      "Idiomas e linguagens da diáspora",
      "Valores familiares e comunitários",
    ],
  },
  {
    id: 6,
    question: "Qual destes pratos da culinária afro-brasileira você mais aprecia?",
    options: [
      "Acarajé e abará",
      "Feijoada",
      "Vatapá e caruru",
      "Moqueca",
      "Cuscuz",
      "Xinxim de galinha",
      "Bobó de camarão",
      "Quibebe",
      "Mungunzá",
      "Canjica",
    ],
  },
  {
    id: 7,
    question: "Como você valoriza a estética afro em sua vida?",
    options: [
      "Usando penteados e estilos tradicionais",
      "Vestindo roupas com estampas africanas",
      "Decorando minha casa com arte afro",
      "Usando adornos e joias de inspiração africana",
      "Apoiando marcas e designers negros",
      "Celebrando a beleza natural do corpo negro",
      "Estudando a história da estética afro",
      "Participando de eventos culturais",
      "Através da fotografia e artes visuais",
      "Incorporando símbolos e significados ancestrais",
    ],
  },
]

export default function QuestionnairePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [started, setStarted] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const totalQuestions = questions.length

  const handleStart = () => {
    setStarted(true)
  }

  const handleAnswer = (answer: string) => {
    // Save the answer
    setAnswers((prev) => ({
      ...prev,
      [questions[currentQuestion].id]: answer,
    }))

    // Move to next question or finish
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion((prev) => prev + 1)
    } else {
      setLoading(true)
      toast({
        title: "Questionário concluído!",
        description: "Processando suas respostas para encontrar os melhores matches...",
      })
    }
  }

  // Simulate processing and redirect to results
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        router.push("/matches")
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [loading, router])

  if (loading) {
    return (
      <div className="app-container justify-center items-center">
        <Logo size="md" className="mb-12" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center max-w-lg"
        >
          <h2 className="text-3xl font-bold gradient-text mb-4">Processando suas respostas</h2>
          <p className="text-xl mb-8 text-oraculo-dark">
            Aguarde enquanto nossa inteligência artificial analisa suas conexões com a cultura afrodiaspórica
            para encontrar suas almas gêmeas.
          </p>

          <Hourglass className="text-oraculo-purple w-32 h-32 mx-auto animate-pulse" />
        </motion.div>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="app-container justify-center items-center">
        <Logo size="md" className="mb-12" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 profile-card p-8 max-w-lg"
        >
          <h3 className="gradient-text text-2xl mb-6 font-semibold">Descubra suas conexões ancestrais</h3>
          <p className="text-oraculo-dark mb-4">
            Este questionário foi cuidadosamente elaborado para compreender sua conexão com a cultura
            afrodiaspórica e encontrar perfis que compartilham de suas afinidades culturais.
          </p>
          <p className="text-oraculo-muted mb-6">
            Reserve alguns minutos para responder com calma e sinceridade. Suas respostas são fundamentais
            para encontrarmos as melhores conexões para você.
          </p>
          <div className="flex flex-col gap-4">
            <Button className="w-full gradient-button h-14" onClick={handleStart}>
              COMEÇAR JORNADA
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 text-oraculo-muted hover:text-oraculo-dark transition-colors"
              onClick={() => router.push("/matches")}
            >
              PULAR QUESTIONÁRIO
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="flex justify-between items-center mb-8">
        <Logo size="sm" />
        <div className="text-oraculo-dark text-xl font-bold">
          {currentQuestion + 1}/{totalQuestions}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="flex-1 max-w-2xl mx-auto"
        >
          <h3 className="gradient-text text-2xl mb-6">{questions[currentQuestion].question}</h3>

          <div className="space-y-3">
            {questions[currentQuestion].options.map((option, index) => (
              <Button
                key={option}
                variant="outline"
                className="w-full justify-start text-oraculo-dark hover:text-oraculo-purple hover:bg-oraculo-purple/10 h-auto py-4 px-4 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                onClick={() => handleAnswer(option)}
              >
                <span className="mr-3 bg-oraculo-purple/10 w-8 h-8 rounded-full flex items-center justify-center text-oraculo-purple font-semibold">
                  {index + 1}
                </span>
                <span className="text-left">{option}</span>
              </Button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

