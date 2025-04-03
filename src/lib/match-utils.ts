import type { GenderPreference, ProfileData, MatchResult } from "./types"

// Função para calcular a compatibilidade entre dois usuários
export function calculateCompatibility(
  userInterests: string[],
  userLocations: string[],
  otherInterests: string[],
  otherLocations: string[],
): MatchResult {
  // Calcular interesses em comum com pesos
  const interestWeights = {
    Música: 1.2,
    Dança: 1.2,
    Culinária: 1.1,
    Arte: 1.1,
    Fotografia: 1.0,
    Viagens: 1.0,
    Leitura: 0.9,
    Esportes: 0.9,
    Cinema: 0.8,
  }

  const commonInterests = userInterests.filter((interest) => otherInterests.includes(interest))
  const weightedInterestScore = commonInterests.reduce((score, interest) => {
    return score + (interestWeights[interest as keyof typeof interestWeights] || 1.0)
  }, 0)

  // Calcular locais em comum com pesos
  const locationWeights = {
    shows: 1.2,
    festivais: 1.2,
    teatros: 1.1,
    museus: 1.1,
    galerias: 1.0,
    restaurantes: 1.0,
    cafes: 0.9,
    parques: 0.9,
    cinemas: 0.8,
  }

  const commonLocations = userLocations.filter((location) => otherLocations.includes(location))
  const weightedLocationScore = commonLocations.reduce((score, location) => {
    return score + (locationWeights[location as keyof typeof locationWeights] || 1.0)
  }, 0)

  // Calcular pontuação de compatibilidade com pesos
  // 60% baseado em interesses, 40% baseado em locais
  const maxInterestScore = Math.min(userInterests.length, otherInterests.length) * 1.2 // Maximum possible weighted score
  const maxLocationScore = Math.min(userLocations.length, otherLocations.length) * 1.2

  const interestScore = maxInterestScore > 0 ? (weightedInterestScore / maxInterestScore) * 60 : 0
  const locationScore = maxLocationScore > 0 ? (weightedLocationScore / maxLocationScore) * 40 : 0

  // Pontuação total (0-100)
  const totalScore = Math.min(Math.round(interestScore + locationScore), 100)

  // Encontrar interesses e locais que se cruzam com relevância cultural
  const crossMatches = commonInterests
    .map((interest) => {
      const relevantLocations = getRelevantLocations(interest, commonLocations)
      return relevantLocations.map((loc) => `${interest} em ${loc}`)
    })
    .flat()

  return {
    score: totalScore,
    commonInterests,
    commonLocations,
    crossMatches,
  }
}

// Função auxiliar para obter locais relevantes para cada interesse
function getRelevantLocations(interest: string, commonLocations: string[]): string[] {
  const interestLocationMap: Record<string, string[]> = {
    Música: ["shows", "festivais", "teatros", "casas-de-show"],
    Cinema: ["cinemas", "festivais", "centros-culturais"],
    Viagens: ["natureza", "praias", "parques", "pontos-turisticos"],
    Culinária: ["restaurantes", "mercados", "feiras-gastronomicas", "festivais"],
    Fotografia: ["galerias", "museus", "natureza", "parques", "pontos-turisticos"],
    Leitura: ["livrarias", "cafes", "parques", "bibliotecas"],
    Esportes: ["esportes", "academias", "parques", "quadras"],
    Arte: ["museus", "galerias", "centros-culturais", "ateliês"],
    Dança: ["clubes", "shows", "festivais", "academias-de-danca"],
  }

  return commonLocations.filter((loc) => 
    interestLocationMap[interest]?.includes(loc)
  )
}

// Função para obter recomendações de perfis com base em interesses, locais e preferências
export function getProfileRecommendations(
  userProfile: ProfileData,
  allProfiles: ProfileData[],
  genderPreference: GenderPreference,
): ProfileData[] {
  return allProfiles
    .filter((profile) => {
      // Filtrar por ID (não mostrar o próprio usuário)
      if (profile.id === userProfile.id) return false

      // Filtrar por preferência de gênero
      if (genderPreference === "HOMEM" && profile.gender !== "HOMEM") return false
      if (genderPreference === "MULHER" && profile.gender !== "MULHER") return false

      return true
    })
    .map((profile) => {
      const { score, commonInterests, commonLocations, crossMatches } = calculateCompatibility(
        userProfile.interests,
        userProfile.locations,
        profile.interests,
        profile.locations,
      )

      return {
        ...profile,
        compatibility: score,
        commonInterests,
        commonLocations,
        crossMatches,
      }
    })
    .sort((a, b) => {
      // Ordenar por compatibilidade e depois por distância
      const compatDiff = (b.compatibility || 0) - (a.compatibility || 0)
      if (Math.abs(compatDiff) > 10) return compatDiff // Priorizar diferenças significativas de compatibilidade
      return Number.parseInt(a.distance) - Number.parseInt(b.distance) // Desempate por distância
    })
}

// Dados de planos de assinatura
export const subscriptionPlans = [
  {
    id: "basic",
    name: "Básico",
    price: 0,
    interval: "month",
    features: [
      "Acesso a perfis básicos",
      "Matches limitados por dia",
      "Filtros básicos de busca",
    ],
    tier: "FREE",
  },
  {
    id: "premium",
    name: "Premium",
    price: 29.90,
    interval: "month",
    features: [
      "Matches ilimitados",
      "Filtros avançados",
      "Visualização de curtidas",
      "Destaque no feed",
      "Sem anúncios",
    ],
    tier: "PREMIUM",
    popular: true,
  },
  {
    id: "vip",
    name: "VIP",
    price: 49.90,
    interval: "month",
    features: [
      "Todos os benefícios Premium",
      "Contato direto via WhatsApp",
      "Prioridade nos matches",
      "Suporte VIP 24/7",
      "Eventos exclusivos",
    ],
    tier: "VIP",
    discount: 20, // 20% de desconto na assinatura anual
  },
] as const

export function isFeatureAvailable(feature: string, subscriptionTier: 'FREE' | 'PREMIUM' | 'VIP'): boolean {
  const featureAccess = {
    FREE: ["basic"],
    PREMIUM: ["basic", "advanced"],
    VIP: ["basic", "advanced", "whatsapp"],
  };

  return featureAccess[subscriptionTier]?.includes(feature) || false;
}

