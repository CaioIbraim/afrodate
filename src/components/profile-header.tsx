"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { MoreVertical, Video, Phone, ChevronLeft } from "lucide-react"
import { PremiumBadge } from "@/components/ui/premium-badge"
import { useRouter } from "next/navigation"

interface ProfileHeaderProps {
  name: string
  avatarUrl?: string
  isPremium?: boolean
  online?: boolean
  lastActive?: string
  onBack?: () => void
  onVideoCall?: () => void
  onVoiceCall?: () => void
  onOpenProfile?: () => void
}

export function ProfileHeader({
  name,
  avatarUrl = "/placeholder.svg",
  isPremium = false,
  online = false,
  lastActive = "Agora",
  onBack,
  onVideoCall,
  onVoiceCall,
  onOpenProfile,
}: ProfileHeaderProps) {
  const router = useRouter()

  return (
    <div className="p-3 border-b border-gray-200 flex items-center justify-between">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="text-oraculo-muted md:hidden mr-2"
          onClick={onBack || (() => router.back())}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <div className="flex items-center">
            <h3 className="font-medium text-oraculo-dark">{name}</h3>
            {isPremium && <PremiumBadge size="sm" className="ml-1" />}
          </div>
          <p className="text-xs text-oraculo-muted">
            {online ? "Online" : `Últ. vez ${lastActive}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-oraculo-muted"
          onClick={onVoiceCall}
        >
          <Phone className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-oraculo-muted"
          onClick={onVideoCall}
        >
          <Video className="h-5 w-5" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-oraculo-muted">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-0">
            <div className="py-1">
              <button
                className="w-full text-left px-4 py-2 text-sm text-oraculo-dark hover:bg-oraculo-purple/10"
                onClick={onOpenProfile}
              >
                Ver perfil
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                Bloquear
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}