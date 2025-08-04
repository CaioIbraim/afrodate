"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { useUser } from "@/hooks/use-user";
import { MoreVertical } from "lucide-react";
import Image from "next/image";

interface ProfileHeaderProps {
  name: string;
  avatarUrl?: string;
  online?: boolean;
  lastActive?: string;
}

export function ProfileHeader({
  name,
  avatarUrl = "/placeholder.svg",
  online = false,
  lastActive = "Agora",
}: ProfileHeaderProps) {
  const { profile } = useUser();

  // Verificar se há uma assinatura ativa
  const hasActiveSubscription = profile?.subscription && profile.subscription.is_active;

  // Formatar a data de expiração da assinatura
  const formatSubscriptionEndDate = (endsAt: string) => {
    return new Date(endsAt).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-white">
      <div className="flex items-center">
        <Image src="/logo.png" height={50} width={50} alt="logo principal" />
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="font-medium text-oraculo-dark">{name}</span>
        </div>
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-oraculo-muted hover:text-[#00FFD1] focus:ring-2 focus:ring-[#00FFD1]"
              aria-label="Mais informações do usuário"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4 bg-white rounded-lg shadow-xl border border-gray-200">
            <div className="space-y-2">
              <div className="flex items-center">
                {hasActiveSubscription && <PremiumBadge size="sm" className="mr-2" />}
                <span className="font-medium text-oraculo-dark">Premium</span>
              </div>
              <p className="text-xs text-oraculo-muted">
                {online ? "Online" : `Últ. vez ${lastActive}`}
              </p>
              {hasActiveSubscription && profile?.subscription?.ends_at ? (
                <p className="text-xs text-oraculo-muted">
                  Assinatura ativa até {formatSubscriptionEndDate(profile.subscription.ends_at)}
                </p>
              ) : (
                <p className="text-xs text-oraculo-muted">Nenhuma assinatura ativa</p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}