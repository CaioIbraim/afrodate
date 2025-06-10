"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"
import Swal from "sweetalert2"
import withReactContent from "sweetalert2-react-content"
import { Loader2 } from "lucide-react";

const MySwal = withReactContent(Swal)
const showAlert = async (type: "success" | "error", title: string, text: string) => {
    return MySwal.fire({
      icon: type,
      title,
      text,
      customClass: {
        popup: "border-2 border-transparent bg-white rounded-xl",
        title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-xl font-bold",
        confirmButton: "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white px-4 py-2 rounded shadow",
      },
      willOpen: (popup) => {
        popup.setAttribute("aria-live", "assertive")
      },
    })
  }
export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    const signOut = async () => {
      try {
        
        const { error } = await supabase.auth.signOut();

        if (error) {
          await showAlert("error", "Ooops!", "Não foi possível fazer logout. Tente novamente.");
          return;
        }

        await showAlert("success", "Sucesso", "Logout realizado com sucesso!");
        router.push("/login");
      } catch (error: any) {
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
