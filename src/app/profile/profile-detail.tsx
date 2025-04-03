"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Heart, Info, MapPin, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { popularLocations } from "@/components/ui/location-selector";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { FeatureLock } from "@/components/ui/feature-lock";
import { useProfile, useLikeProfile } from "@/hooks/use-profiles";
import { isFeatureAvailable } from "@/lib/match-utils";
import type { SubscriptionTier } from "@/lib/types";

interface ProfileDetailPageProps {
  params: { id: string };
}

export function ProfileDetailPage({ params }: ProfileDetailPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showingLocations, setShowingLocations] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);

  const profileId = Number.parseInt(params.id);
  const { data: profile, isLoading: profileLoading, error } = useProfile(profileId);
  const { mutate: likeProfile } = useLikeProfile();

  const currentUserSubscription: SubscriptionTier = "FREE";

  const handleNextPhoto = () => {
    if (!profile?.photos?.length) return;
    setCurrentPhotoIndex((prev) => (prev < profile.photos.length - 1 ? prev + 1 : 0));
  };

  const handlePrevPhoto = () => {
    if (!profile?.photos?.length) return;
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : profile.photos.length - 1));
  };

  const handleLike = () => {
    toast({
      title: "Curtida enviada!",
      description: `Você curtiu o perfil de ${profile?.name}.`,
    });
    setTimeout(() => router.push("/discover"), 1500);
  };

  const handleDislike = () => {
    router.push("/discover");
  };

  const handleBackToDiscover = () => {
    router.push("/discover");
  };

  const toggleLocations = () => {
    setShowingLocations(!showingLocations);
  };

  const handleWhatsappContact = () => {
    if (currentUserSubscription === "VIP") {
      if (profile?.contactInfo?.whatsapp) {
        window.open(`https://wa.me/${profile.contactInfo.whatsapp}`, "_blank");
      } else {
        toast({
          title: "Contato indisponível",
          description: "Este usuário não disponibilizou seu WhatsApp.",
          variant: "destructive",
        });
      }
    } else {
      setShowWhatsappModal(true);
    }
  };

  const handleUpgrade = () => {
    router.push("/subscription");
  };

  if (profileLoading) {
    return (
      <div className="app-container justify-center items-center">
        <div className="animate-pulse space-y-4 w-full max-w-md">
          <div className="h-[60vh] bg-gray-200 rounded-lg" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="app-container justify-center items-center">
        <p className="text-oraculo-dark text-xl">{error || "Perfil não encontrado"}</p>
        <Button className="mt-4 gradient-button" onClick={() => router.push("/discover")}>
          Voltar para Descobrir
        </Button>
      </div>
    );
  }

  const canAccessWhatsapp = isFeatureAvailable("whatsapp", currentUserSubscription);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="relative h-[60vh]">
        <Button
          variant="ghost"
          className="absolute top-4 left-4 z-10 text-white bg-oraculo-dark/30 rounded-full p-2"
          onClick={handleBackToDiscover}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-white/80 px-3 py-1 rounded-full">
          <Heart className="h-4 w-4 text-oraculo-purple" />
          <span className="text-sm gradient-text font-semibold">{profile.compatibility}%</span>
        </div>

        {profile.isPremium && (
          <div className="absolute top-16 right-4 z-10">
            <PremiumBadge type={profile.contactInfo?.whatsapp ? "vip" : "premium"} />
          </div>
        )}

        <div className="relative h-full w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPhotoIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Image
                src={profile.photos[currentPhotoIndex] || "/placeholder.svg"}
                alt={`Foto de ${profile.name}`}
                fill
                className="object-cover"
              />
            </motion.div>
          </AnimatePresence>

          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
            {profile.photos.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentPhotoIndex
                    ? "w-6 bg-gradient-to-r from-oraculo-purple to-oraculo-cyan"
                    : "w-1.5 bg-white/60"
                }`}
              />
            ))}
          </div>

          <div className="absolute left-0 top-0 bottom-0 w-1/3 z-10" onClick={handlePrevPhoto} />
          <div className="absolute right-0 top-0 bottom-0 w-1/3 z-10" onClick={handleNextPhoto} />
        </div>
      </div>

      <div className="flex-1 p-6 bg-white">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold gradient-text">
                {profile.name}, {profile.age}
              </h1>
              <div className="flex items-center text-oraculo-muted">
                <MapPin className="h-4 w-4 mr-1" />
                <span>
                  {profile.city} • {profile.distance}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-oraculo-purple/50 bg-white text-oraculo-purple"
              onClick={toggleLocations}
            >
              <Info className="h-5 w-5" />
            </Button>
          </div>

          {profile.crossMatches && profile.crossMatches.length > 0 && (
            <div className="profile-card p-4 mb-6 border-oraculo-purple border">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-oraculo-purple" />
                <h2 className="text-lg font-semibold gradient-text">Compatibilidade Especial</h2>
              </div>
              <p className="text-oraculo-dark mb-3">Vocês compartilham interesses e lugares:</p>
              <div className="flex flex-wrap gap-2">
                {profile.crossMatches.map((match, index) => (
                  <Badge key={index} className="bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white">
                    {match}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="profile-card p-4 mb-6">
            <h2 className="text-lg font-semibold gradient-text mb-2">Sobre</h2>
            <p className="text-oraculo-dark">{profile.bio}</p>
          </div>

          <AnimatePresence mode="wait">
            {showingLocations ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className="profile-card p-4 mb-6"
              >
                <h2 className="text-lg font-semibold gradient-text mb-2">Lugares Favoritos</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.locations.map((location) => {
                    const locationData = popularLocations.find((l) => l.value === location);
                    return (
                      <Badge
                        key={location}
                        className="bg-oraculo-purple/10 text-oraculo-purple border border-oraculo-purple/30"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        {locationData?.label || location}
                      </Badge>
                    );
                  })}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="flex gap-4 mt-8">
            <Button
              variant="outline"
              className="flex-1 border-red-500/50 hover:border-red-500 text-red-500 hover:text-red-600"
              onClick={handleDislike}
            >
              Passar
            </Button>
            <Button className="flex-1 gradient-button" onClick={handleLike}>
              Curtir
            </Button>
          </div>

          {profile.contactInfo?.whatsapp && (
            <Button
              className={`w-full mt-4 ${canAccessWhatsapp ? "bg-green-500 hover:bg-green-600" : "bg-gray-400"} text-white`}
              onClick={handleWhatsappContact}
              disabled={!canAccessWhatsapp}
            >
              Conversar no WhatsApp
            </Button>
          )}
        </div>
      </div>

      {showWhatsappModal && (
        <FeatureLock
          title="Acesso VIP necessário"
          description="Para conversar diretamente pelo WhatsApp, você precisa ser um usuário VIP."
          onClose={() => setShowWhatsappModal(false)}
          onUpgrade={handleUpgrade}
        />
      )}
    </div>
  );
}
