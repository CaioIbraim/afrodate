import { cn } from "@/lib/utils"

interface VivaLogoProps {
  className?: string
}

export function VivaLogo({ className }: VivaLogoProps) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("w-10 h-10", className)}>
      <circle cx="100" cy="100" r="90" fill="url(#paint0_linear)" />
      <path
        d="M60 70C60 64.4772 64.4772 60 70 60H130C135.523 60 140 64.4772 140 70V130C140 135.523 135.523 140 130 140H70C64.4772 140 60 135.523 60 130V70Z"
        fill="white"
      />
      <path
        d="M85 85C85 79.4772 89.4772 75 95 75H105C110.523 75 115 79.4772 115 85V115C115 120.523 110.523 125 105 125H95C89.4772 125 85 120.523 85 115V85Z"
        fill="url(#paint1_linear)"
      />
      <path d="M45 140L65 100L85 140" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M115 140L135 100L155 140" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="paint0_linear" x1="10" y1="10" x2="190" y2="190" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DC2626" />
          <stop offset="0.5" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="paint1_linear" x1="85" y1="75" x2="115" y2="125" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DC2626" />
          <stop offset="0.5" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
    </svg>
  )
}

