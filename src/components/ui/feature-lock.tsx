"use client"

import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface FeatureLockProps {
  message: string
  className?: string
}

export function FeatureLock({ message, className }: FeatureLockProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    router.push("/subscription")
  }

  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-oraculo-purple/10 flex items-center justify-center mb-4">
        <Lock className="h-8 w-8 text-oraculo-purple" />
      </div>
      <h3 className="text-lg font-semibold text-oraculo-dark mb-2">Recurso Bloqueado</h3>
      <p className="text-oraculo-muted mb-4">{message}</p>
      <Button className="gradient-button" onClick={handleUpgrade}>
        Fazer Upgrade
      </Button>
    </div>
  )
}

