import { Crown, Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface PremiumBadgeProps {
  type?: "premium" | "vip"
  size?: "sm" | "md" | "lg"
  className?: string
}

export function PremiumBadge({ type = "premium", size = "md", className }: PremiumBadgeProps) {
  const sizes = {
    sm: "text-xs py-0.5 px-1.5",
    md: "text-sm py-1 px-2",
    lg: "text-base py-1.5 px-3",
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  if (type === "vip") {
    return (
      <div
        className={cn(
          "bg-gradient-to-r from-amber-500 to-yellow-300 text-black font-semibold rounded-full flex items-center",
          sizes[size],
          className,
        )}
      >
        <Crown className={cn("mr-1", iconSizes[size])} />
        <span>VIP</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white font-semibold rounded-full flex items-center",
        sizes[size],
        className,
      )}
    >
      <Star className={cn("mr-1", iconSizes[size])} />
      <span>Premium</span>
    </div>
  )
}

