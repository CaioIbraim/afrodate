// src/components/ui/styled-alert.ts
"use client"

import Swal from "sweetalert2"
import withReactContent from "sweetalert2-react-content"
import "@/styles/sweetalert-custom.css" // Importa estilos personalizados

const MySwal = withReactContent(Swal)

export function showSuccessAlert() {
  return MySwal.fire({
    title: "<strong>Login realizado com sucesso!</strong>",
    html: "<p>Redirecionando para sua conta...</p>",
    icon: "success",
    customClass: {
      popup: "border-2 border-gradient bg-white rounded-xl",
      title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-xl font-bold",
      confirmButton: "bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white px-4 py-2 rounded shadow",
    },
    showConfirmButton: false,
    timer: 1500,
  })
}

export function showErrorAlert(message: string) {
  return MySwal.fire({
    title: "<strong>Erro ao fazer login</strong>",
    html: `<p>${message}</p>`,
    icon: "error",
    customClass: {
      popup: "border-2 border-gradient bg-white rounded-xl",
      title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-xl font-bold",
      confirmButton: "bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white px-4 py-2 rounded shadow",
    },
    confirmButtonText: "Fechar",
  })
}
