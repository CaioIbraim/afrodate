"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { MoreVertical, Video, Phone, LogOut, Heart, Search, User, Coins } from "lucide-react";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { useState } from "react";
import Image from "next/image";

interface ProfileHeaderProps {
  name: string;
  avatarUrl?: string;
  online?: boolean;
  lastActive?: string;
  onBack?: () => void;
  onVideoCall?: () => void;
  onVoiceCall?: () => void;
  onOpenProfile?: () => void;
}

export function ProfileHeader({
  name,
  avatarUrl = "/placeholder.svg",
  online = false,
  lastActive = "Agora",
  onVideoCall,
  onVoiceCall,
  onOpenProfile,
}: ProfileHeaderProps) {
  const router = useRouter();
  const { profile } = useUser();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Verificar se o perfil está completo
  const isProfileComplete = profile && 
    profile.name && 
    profile.bio && 
    profile.gender && 
    profile.birth_date;

  // Verificar se há uma assinatura ativa
  const hasActiveSubscription = profile?.subscription && profile.subscription.is_active;

  // Função para realizar logout
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Navegação para a página de likes
  const navigateToLikes = () => {
    router.push("/liked-me");
  };

  // Navegação para a página de discover
  const navigateToDiscover = () => {
    router.push("/discover/v6");
  };

  // Navegação para a página de logout
  const navigateToLogout = () => {
    router.push("/signout");
  };

  // Navegação para a página de perfil
  const navigateToProfile = () => {
    router.push("/profile");
  };

  // Formatar a data de expiração da assinatura
  const formatSubscriptionEndDate = (endsAt: string) => {
    return new Date(endsAt).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="p-3 border-b border-gray-200 flex items-center justify-between">
      <div className="flex items-center">
        {/* Logo do projeto, posicionado à esquerda */}
        <Image src="/logo.png" height={50} width={50} alt="logo principal" />
      </div>
      
      <div className="flex items-center gap-2">
        {/* Avatar movido para a direita */}
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-oraculo-muted">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0">
            <div className="py-1">
              {/* Informações do usuário */}
              <div className="px-4 py-2 border-b border-gray-200">
                <div className="flex items-center">
                  <span className="font-medium text-oraculo-dark">{name}</span>
                  {hasActiveSubscription && <PremiumBadge size="sm" className="ml-1" />}
                </div>
                <p className="text-xs text-oraculo-muted">
                  {online ? "Online" : `Últ. vez ${lastActive}`}
                </p>
                {hasActiveSubscription && profile?.subscription?.ends_at && (
                  <p className="text-xs text-oraculo-muted">
                    Assinatura ativa até {formatSubscriptionEndDate(profile.subscription.ends_at)}
                  </p>
                )}
                {!hasActiveSubscription && (
                  <p className="text-xs text-oraculo-muted">
                    Nenhuma assinatura ativa
                  </p>
                )}
              </div>
              
              {/* Menus condicionais baseados na completude do perfil */}
              {isProfileComplete && (
                <>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-oraculo-dark hover:bg-[#00FFD1]/10 flex items-center"
                    onClick={navigateToLikes}
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Likes
                  </button>
                 
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-oraculo-dark hover:bg-[#00FFD1]/10 flex items-center"
                    onClick={navigateToDiscover}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Oráculo
                  </button>
                </>
              )}
              
              {/* Opções de chamada condicional baseadas na assinatura */}
              {/*
              {hasActiveSubscription && (
                <>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-oraculo-dark hover:bg-[#00FFD1]/10 flex items-center"
                    onClick={onVoiceCall}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Ligação por voz
                  </button>
                  
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-oraculo-dark hover:bg-[#00FFD1]/10 flex items-center"
                    onClick={onVideoCall}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Videochamada
                  </button>
                </>
              )}
              */}
              
              <button
                className="w-full text-left px-4 py-2 text-sm text-oraculo-dark hover:bg-[#00FFD1]/10 flex items-center"
                onClick={navigateToProfile}
              >
                <User className="h-4 w-4 mr-2" />
                Ver perfil
              </button>

              {!hasActiveSubscription && (
                <button
                  className="w-full text-left px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50 flex items-center"
                  onClick={() => router.push("/buy-coins")}
                >
                  <Coins className="h-4 w-4 mr-2" />
                  Comprar moedas
                </button>
              )}
              
              <button 
                className="w-full text-left px-4 py-2 text-sm text-oraculo-dark hover:bg-[#00FFD1]/10 flex items-center"
                onClick={navigateToLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLoggingOut ? "Saindo..." : "Sair"}
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
