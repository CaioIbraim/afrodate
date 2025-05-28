// src/lib/auth.ts

import { supabase } from "./supabase";
import { useRouter } from "next/navigation";

/**
 * Função para realizar o logout do usuário
 * @returns Promise que resolve quando o logout for concluído
 */
export const logout = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    // Limpar qualquer estado local se necessário
    localStorage.removeItem("supabase.auth.token");
  } catch (error) {
    console.log("Erro ao fazer logout:", error);
    throw error;
  }
};

/**
 * Hook para realizar logout e redirecionar
 */
export const useLogout = () => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout(); // Call the plain logout function
      router.push("/login"); // Navigate to the login page
    } catch (error) {
      console.log("Erro ao fazer logout:", error);
    }
  };

  return { handleLogout };
};