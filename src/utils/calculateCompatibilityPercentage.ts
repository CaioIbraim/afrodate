import { type Profile } from "@/lib/types";

/**
 * Calcula a idade de uma pessoa a partir da data de nascimento.
 * @param birthDate - A data de nascimento em formato de string (ex: "YYYY-MM-DD").
 * @returns A idade como um número, ou null se a data for inválida.
 */
const calculateAge = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  
  // Adiciona 'T00:00:00' para garantir que a data seja interpretada em UTC e evitar problemas de fuso horário.
  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();

  if (isNaN(birth.getTime())) return null; // Verifica se a data é válida

  let age = today.getFullYear() - birth.getFullYear();
  const monthDifference = today.getMonth() - birth.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Calcula a porcentagem de compatibilidade entre dois perfis.
 * A pontuação é baseada em interesses em comum, preferência de gênero e faixa etária.
 * @param userProfile - O perfil do usuário logado.
 * @param viewedProfile - O perfil do usuário que está sendo visualizado.
 * @returns Um número de 0 a 100 representando a compatibilidade.
 */
export const calculateCompatibilityPercentage = (userProfile: Profile, viewedProfile: Profile): number => {
  if (!userProfile || !viewedProfile) {
    return 0;
  }

  let score = 0;
  const maxScore = 100; // Pontuação máxima possível

  // 1. Pontuação por Interesses em Comum (até 50 pontos)
  const userInterests = userProfile.interests || [];
  const viewedInterests = viewedProfile.interests || [];
  const commonInterests = userInterests.filter(interest => viewedInterests.includes(interest));
  score += Math.min(commonInterests.length * 5, 50); // 5 pontos por interesse, com máximo de 50

  // 2. Pontuação por Preferência de Gênero (20 pontos)
  if (
    userProfile.gender_preference &&
    viewedProfile.gender &&
    (userProfile.gender_preference === 'TODOS' || userProfile.gender_preference === viewedProfile.gender)
  ) {
    score += 20;
  }

  // 3. Pontuação por Faixa Etária (20 pontos)
  const viewedAge = calculateAge(viewedProfile.birth_date);
  if (viewedAge !== null) {
    if (viewedAge >= userProfile.min_age && viewedAge <= userProfile.max_age) {
      score += 20;
    }
  }

  // 4. Bônus por Localização (10 pontos)
  // Apenas verifica se ambos compartilham localização, sem calcular a distância aqui.
  if (
    userProfile.latitude && userProfile.longitude &&
    viewedProfile.latitude && viewedProfile.longitude
  ) {
    score += 10;
  }

  // Normaliza o resultado para garantir que não passe de 100 e arredonda.
  return Math.min(Math.round(score), maxScore);
};