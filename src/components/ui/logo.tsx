import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  withHearts?: boolean
  className?: string
}

export function Logo({ size = "md", withHearts = false, className }: LogoProps) {
  const textSizes = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl",
  }

  const subtitleSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-lg",
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <h1 className={cn("font-bold tracking-tight", textSizes[size])}>ORÁCULO</h1>
      <h2 className={cn("mt-1", subtitleSizes[size])}>BUSCADOR DE ALMA GÊMEA</h2>

      {withHearts && (
        <div className="relative w-48 h-32 mt-6">
          <Heart
            className="absolute text-white w-32 h-32 left-0 top-0 animate-pulse-soft"
            style={{ animationDuration: "3s" }}
          />
          <Heart
            className="absolute text-white/80 w-16 h-16 right-4 top-0 animate-pulse-soft"
            style={{ animationDuration: "4s" }}
          />
          <Heart
            className="absolute text-white/60 w-16 h-16 right-12 bottom-0 animate-pulse-soft"
            style={{ animationDuration: "5s" }}
          />
        </div>
      )}
    </div>
  )
}

