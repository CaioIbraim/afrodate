// ... existing code ...

import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Home, Search, MessageSquare, User } from "lucide-react"

export function BottomNav() {
  const { user, profile } = useUser()
  const router = useRouter()
  const profileImageUrl = profile?.photos?.[0]?.url || null
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t py-2 px-4">
      <div className="flex items-center justify-around">
        {/* ... outros itens do menu ... */}
        
        {/* Item de perfil */}
        <button 
          className="flex flex-col items-center justify-center gap-1"
          onClick={() => router.push("/profile")}
        >
          <div className="relative">
            <Avatar className="h-8 w-8 border-2 border-primary hover:border-primary/80 transition-colors">
              <AvatarImage src={profileImageUrl} alt="Foto de perfil" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </div>
          <span className="text-xs">Perfil</span>
        </button>
      </div>
    </div>
  )
}