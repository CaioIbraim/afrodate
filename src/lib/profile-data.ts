// Profile data types
export interface Profile {
  id: number
  name: string
  age: number
  gender: string
  city: string
  distance: string
  compatibility: number
  bio: string
  interests: string[]
  locations: string[]
  photos: string[]
  crossMatches?: string[]
  isPremium?: boolean
  contactInfo?: {
    whatsapp: string
  }
}

// Simulated profile data
export const profilesData: Profile[] = [
  {
    id: 1,
    name: "Ana",
    age: 28,
    gender: "MULHER",
    city: "São Paulo",
    distance: "5km",
    compatibility: 95,
    bio: "Adoro música e filmes de aventura. Sempre em busca de novas experiências e lugares para conhecer.",
    interests: ["Música", "Cinema", "Viagens"],
    locations: ["shows", "cinemas", "parques", "cafes", "festivais"],
    photos: [
      "/images/female-profile.png",
      "/placeholder.svg?height=600&width=400",
      "/placeholder.svg?height=600&width=400",
    ],
    crossMatches: ["Música em shows", "Cinema em cinemas"],
    isPremium: true,
    contactInfo: {
      whatsapp: "+5511999999999",
    },
  },
  {
    id: 2,
    name: "Carlos",
    age: 30,
    gender: "HOMEM",
    city: "Rio de Janeiro",
    distance: "12km",
    compatibility: 88,
    bio: "Fã de rock e esportes ao ar livre. Gosto de trilhas, escalada e tudo que envolva natureza.",
    interests: ["Esportes", "Rock", "Natureza"],
    locations: ["parques", "natureza", "esportes", "shows"],
    photos: ["/images/male-profile-1.png", "/placeholder.svg?height=600&width=400"],
    crossMatches: ["Esportes em parques"],
  },
  {
    id: 3,
    name: "Juliana",
    age: 26,
    gender: "MULHER",
    city: "Belo Horizonte",
    distance: "8km",
    compatibility: 92,
    bio: "Amo viajar e conhecer novas culturas. Fotógrafa nas horas vagas e apaixonada por gastronomia.",
    interests: ["Fotografia", "Culinária", "Livros"],
    locations: ["museus", "restaurantes", "cafes", "livrarias", "mercados"],
    photos: [
      "/images/female-profile-1.png",
      "/placeholder.svg?height=600&width=400",
      "/placeholder.svg?height=600&width=400",
      "/placeholder.svg?height=600&width=400",
    ],
    crossMatches: ["Fotografia em museus", "Culinária em restaurantes"],
    isPremium: true,
  },
  {
    id: 4,
    name: "Rafael",
    age: 32,
    gender: "HOMEM",
    city: "Curitiba",
    distance: "15km",
    compatibility: 85,
    bio: "Trabalho com tecnologia e adoro jogos. Nas horas vagas gosto de maratonar séries e animes.",
    interests: ["Tecnologia", "Jogos", "Séries"],
    locations: ["cinemas", "shopping", "cafes"],
    photos: ["/images/male-profile-1.png", "/placeholder.svg?height=600&width=400"],
  },
  {
    id: 5,
    name: "Mariana",
    age: 27,
    gender: "MULHER",
    city: "Salvador",
    distance: "20km",
    compatibility: 90,
    bio: "Dançarina e amante da praia. Adoro festivais de música e qualquer evento ao ar livre.",
    interests: ["Dança", "Praia", "Música"],
    locations: ["praias", "clubes", "shows", "festivais", "parques"],
    photos: [
      "/images/female-profile.png",
      "/placeholder.svg?height=600&width=400",
      "/placeholder.svg?height=600&width=400",
    ],
    crossMatches: ["Dança em clubes", "Música em festivais"],
  },
  {
    id: 6,
    name: "Lucas",
    age: 29,
    gender: "HOMEM",
    city: "Brasília",
    distance: "10km",
    compatibility: 87,
    bio: "Interessado em política e história. Pratico esportes regularmente e gosto de debates.",
    interests: ["Política", "História", "Esportes"],
    locations: ["museus", "centros-culturais", "esportes", "parques"],
    photos: ["/images/male-profile-1.png", "/placeholder.svg?height=600&width=400"],
    crossMatches: ["Esportes em parques"],
  },
]