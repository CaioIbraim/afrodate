import type { SVGProps } from "react";

/**
 * Ícone "Oráculo Iluminado" baseado na imagem fornecida.
 * Representa um olho esotérico dentro de um triângulo com raios de luz.
 */
export const OracleIlluminatedIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* O triângulo principal */}
    <path d="M12 2L2 21h20L12 2z" />
    
    {/* O olho (forma de amêndoa) */}
    <path d="M12 16.5c-4 0-6-2.5-6-4.5s2-4.5 6-4.5 6 2.5 6 4.5-2 4.5-6 4.5z" />
    
    {/* A pupila */}
    <circle cx="12" cy="12" r="1.5" />
    
    {/* Raios de luz saindo do topo */}
    <path d="M12 2V1" />
    <path d="M15 4.5l.75-.75" />
    <path d="M9 4.5l-.75-.75" />
  </svg>
);