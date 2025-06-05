import Image from "next/image"
import { Loader2 } from "lucide-react"

export function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-50 bg-white/80 flex flex-col items-center justify-center backdrop-blur-sm">
      <Image src="/logo.png" alt="Logo" width={100} height={100} className="mb-6 animate-pulse" />
      <Loader2 className="w-8 h-8 text-oraculo-purple animate-spin" />
    </div>
  )
}