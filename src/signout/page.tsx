"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Loader2 } from "lucide-react";
const MySwal = withReactContent(Swal);
export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    const signOut = async () => {
      try {
        const { error } = await supabase.auth.signOut();

        if (error) {
          console.error("Error signing out:", error);
          await showAlert("error", "Ooops!", "Não foi possível fazer logout. Tente novamente.");
          return;
        }

        await showAlert("success", "Sucesso", "Logout realizado com sucesso!");
        router.push("/login");
      } catch (error: any) {
        console.error("Unexpected error during sign-out:", error);
        await showAlert("error", "Ooops!", "Ocorreu um erro inesperado. Tente novamente.");
      }
    };

    signOut();
  }, [router]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 justify-center items-center">
      <Loader2 className="h-8 w-8 animate-spin text-oraculo-purple" />
      <p className="text-oraculo-muted mt-4">Saindo...</p>
    </div>
  );
}