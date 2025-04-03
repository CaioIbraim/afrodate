"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Hourglass } from "lucide-react"

export default function LoadingPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/matches")
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="w-full max-w-md">
        <h1 className="text-5xl font-bold tracking-tight text-emerald-400 mb-2">ORÁCULO</h1>
        <h2 className="text-xl text-emerald-400 mb-16">BUSCADOR DE ALMA GÊMEA</h2>

        <div className="space-y-6 mb-16">
          <p className="text-emerald-400 text-2xl">
            PARABÉNS! Aguarde, em alguns minutos saberá os três perfis que mais chances tem de serem sua alma gêmea.
          </p>
        </div>

        <div className="flex justify-center">
          <Hourglass className="text-emerald-400 w-32 h-32 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

