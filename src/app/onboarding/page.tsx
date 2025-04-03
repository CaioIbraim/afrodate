"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { UserCircle, ChevronLeft, ChevronRight } from "lucide-react"
import  InputMask  from "react-input-mask"

export default function OnboardingPage() {
  const router = useRouter()
  const [gender, setGender] = useState("HOMEM")
  const [birthDate, setBirthDate] = useState("")
  const [city, setCity] = useState("")
  const [contact, setContact] = useState("")

  const handleComplete = () => {
    router.push("/questionnaire")
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-6">
      <div className="w-full max-w-md">
        <h1 className="text-5xl font-bold tracking-tight text-emerald-400 text-center mb-2">ORÁCULO</h1>
        <h2 className="text-xl text-emerald-400 text-center mb-12">BUSCADOR DE ALMA GÊMEA</h2>

        <h3 className="text-3xl font-bold text-emerald-400 text-center mb-8">PERFIL</h3>

        <div className="flex flex-col items-center mb-12">
          <div className="relative w-32 h-32 rounded-full border-2 border-emerald-400 flex items-center justify-center mb-2">
            <UserCircle className="w-24 h-24 text-emerald-400" />
          </div>
          <p className="text-emerald-400">Adicione sua foto</p>
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <p className="text-emerald-400 text-xl">Qual é o seu gênero?</p>
            <div className="flex items-center">
              <p className="text-emerald-400 text-xl mr-4">{gender}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full border-emerald-400 bg-transparent"
                  onClick={() => setGender(gender === "HOMEM" ? "MULHER" : "HOMEM")}
                >
                  <ChevronLeft className="h-6 w-6 text-emerald-400" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full border-emerald-400 bg-transparent"
                  onClick={() => setGender(gender === "HOMEM" ? "MULHER" : "HOMEM")}
                >
                  <ChevronRight className="h-6 w-6 text-emerald-400" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <p className="text-emerald-400 text-xl mb-2">Data de nascimento:</p>
            <InputMask
              mask="99/99/9999"
              maskChar={null}
              type="text"
              placeholder="DD/MM/AAAA"
              className="bg-transparent border-emerald-400 text-emerald-400"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>

          <div>
            <p className="text-emerald-400 text-xl mb-2">Cidade atual:</p>
            <Input
              type="text"
              className="bg-transparent border-emerald-400 text-emerald-400"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div>
            <p className="text-emerald-400 text-xl mb-2">Seu contato:</p>
            <InputMask
              mask="(99) 99999-9999"
              maskChar={null}
              type="text"
              className="bg-transparent border-emerald-400 text-emerald-400"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>

          <Button
            className="w-full bg-gradient-to-r from-emerald-500 to-green-400 text-black font-semibold h-12 mt-8"
            onClick={handleComplete}
          >
            Continuar
          </Button>
        </div>
      </div>
    </div>
  )
}

