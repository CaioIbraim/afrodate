"use client";

import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { useState } from "react";
import { Heart, Search, User, Star, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { supabase } from "@/lib/supabase";
import { OracleIlluminatedIcon } from "@/components/oraculo-icons/EsotericEyeIcon";

export function MobileFooterMenu() {
    const router = useRouter();
    const pathname = usePathname();
    const { profile } = useUser();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const isProfileComplete = profile && 
      profile.name && 
      profile.bio && 
      profile.gender && 
      profile.birth_date;

    const hasActiveSubscription = profile?.subscription && profile.subscription.is_active;

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

    const navigateToLikes = () => router.push("/liked-me");
    const navigateToDiscover = () => router.push("/discover/v6");
    const navigateToProfile = () => router.push("/profile");
    const navigateToSubscription = () => router.push("/subscription");
    const navigateToLogout = () => router.push("/signout");

    const getNavItemStyles = (path: string) => {
        const isActive = pathname.startsWith(path);
        const activeClasses = "text-[#00FFD1] bg-gray-100 dark:bg-gray-800";
        const inactiveClasses = "text-oraculo-dark hover:bg-gray-100 hover:text-[#00FFD1]";
        return `flex flex-col items-center justify-center p-2 rounded-lg transition-colors w-1/5 ${isActive ? activeClasses : inactiveClasses}`;
    };

    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 md:hidden">
            {/* Ajustada a altura do footer de h-16 para h-14 e espaçamento interno */}
            <div className="flex justify-between items-center h-14 px-2">
                {isProfileComplete && (
                    <>
                        <button
                            className={getNavItemStyles("/liked-me")}
                            onClick={navigateToLikes}
                            aria-label="Ver quem curtiu você"
                        >
                            <Heart className="h-5 w-5" />
                            <span className="text-xs mt-1">Likes</span>
                        </button>
                       
                    </>
                )}
                 <button
                            className={getNavItemStyles("/discover")}
                            onClick={navigateToDiscover}
                            aria-label="Explorar perfis"
                        >
                            <OracleIlluminatedIcon className="h-5 w-5" />
                            <span className="text-xs mt-1">Oráculo</span>
                        </button>
                <button
                    className={getNavItemStyles("/profile")}
                    onClick={navigateToProfile}
                    aria-label="Ver seu perfil"
                >
                    <User className="h-5 w-5" />
                    <span className="text-xs mt-1">Perfil</span>
                </button>
                {!hasActiveSubscription && (
                    <button
                        className="relative flex flex-col items-center p-1 rounded-lg transition-all w-1/5 shadow-md
                                   bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white hover:opacity-90"
                        onClick={navigateToSubscription}
                        aria-label="Assinar plano premium"
                    >
                        <Star className="h-5 w-5" />
                        <span className="text-xs mt-1">Assinar</span>
                    </button>
                )}
                <button
                    className={getNavItemStyles("/signout")}
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    aria-label={isLoggingOut ? "Saindo..." : "Sair"}
                >
                    <LogOut className="h-5 w-5" />
                    <span className="text-xs mt-1">{isLoggingOut ? "Saindo..." : "Sair"}</span>
                </button>
            </div>
        </footer>
    );
}
