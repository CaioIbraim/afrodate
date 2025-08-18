// /components/GradientButton.tsx
import Link from 'next/link';
import type { ReactNode } from 'react';

// Definindo os tipos para as props do componente
type GradientButtonProps = {
  href: string;
  children: ReactNode;
  className?: string; // className é opcional
};

export default function GradientButton({ href, children, className = '' }: GradientButtonProps) {
  return (
    // A div externa cria a borda gradiente com padding
    <div className={`mt-6 rounded-lg p-[2px] bg-gradient-to-r from-oraculo-cyan to-[#4DBAFE] transition-all duration-300 ${className}`}>
      <Link href={href} passHref>
        {/* O link interno tem a cor de fundo sólida */}
        <span className="w-full flex items-center justify-center px-8 py-3 text-base font-medium rounded-md text-white bg-[#181818] hover:bg-transparent transition-all duration-300 md:py-4 md:text-lg md:px-10">
          {children}
        </span>
      </Link>
    </div>
  );
}