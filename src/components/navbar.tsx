// ... existing code ...

import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"

export function Navbar() {
  const { user, profile } = useUser()
  const router = useRouter()
  
  // Função para navegar para a página de perfil
  const navigateToProfile = () => {
    router.push("/profile")
  }
  
  // Obter a URL da imagem de perfil (primeira foto do usuário)
  const profileImageUrl = profile?.photos?.[0]?.url || null
  
  return (
    <nav className="flex items-center justify-between p-4 border-b">
      {/* ... existing code ... */}
      
      {/* Botão de perfil com avatar */}
      <div className="flex items-center gap-4">
        {/* ... outros itens do menu ... */}
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full" 
          onClick={navigateToProfile}
          title="Meu Perfil"
        >
          <Avatar className="h-9 w-9 border-2 border-primary hover:border-primary/80 transition-colors">
            <AvatarImage src={profileImageUrl} alt="Foto de perfil" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </div>
    </nav>
  )
}