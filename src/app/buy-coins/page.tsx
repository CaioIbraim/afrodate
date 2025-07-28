'use client'
import PixPaymentWithCustomer from '@/components/PixPaymentWithCustomer';
import { useState } from 'react';
import { useUser } from '@/hooks/use-user';
import { ProfileHeader } from '@/components/profile-header';

export default function BuyCoinsPage() {
  const { user, isLoading, profile } = useUser();
  const [asaasCustomerId, setAsaasCustomerId] = useState(null);
  const [error, setError] = useState(null);
  const [cpf, setCpf] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const checkAndCreateAsaasUser = async (cpfValue: string) => {
    if (!user || !cpfValue) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/check-and-create-asaas-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profile?.name || 'Usuário',
          cpf: cpfValue,
          email: user.email
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.customerId) {
          setAsaasCustomerId(data.customerId);
        }
      } else {
        setError(data.error || 'Erro ao processar cliente.');
      }
    } catch (error) {
      console.error("Error fetching Asaas customer ID:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCpfSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cpf) {
      checkAndCreateAsaasUser(cpf);
    }
  };


  
  if (isLoading || isProcessing) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900">
        <p className="text-lg font-semibold">Carregando...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900">
        <p className="text-red-500 text-lg font-semibold">Erro: {error}</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900">
        <p className="text-lg font-semibold">Por favor, faça login para comprar coins.</p>
      </main>
    );
  }

  if (!asaasCustomerId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900">
        <h1 className="text-3xl font-bold mb-6">Informar CPF</h1>
        <div className="max-w-md text-center mb-6">
          <p className="text-sm text-gray-700">
            Para criar sua conta e processar pagamentos com segurança, precisamos do seu CPF. Esta informação é utilizada exclusivamente pelo nosso parceiro de pagamentos, Asaas, para garantir transações seguras e conformidade com as regulamentações financeiras. Nossa plataforma é totalmente segura, e seus dados são protegidos com criptografia avançada.
          </p>
        </div>
        <form onSubmit={handleCpfSubmit} className="flex flex-col items-center w-full max-w-sm">
          <label htmlFor="cpf" className="mb-3 text-sm font-medium text-gray-700">Por favor, informe seu CPF para continuar:</label>
          <input
            type="text"
            id="cpf"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            className="border border-gray-300 p-3 rounded-xl mb-4 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFD1] transition-all duration-200"
            placeholder="Digite seu CPF"
            required
          />
          <button
            type="submit"
            className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white rounded-full text-sm font-semibold hover:opacity-90 transition-all duration-200 ease-in-out disabled:opacity-50"
            disabled={!cpf}
            aria-label="Enviar CPF"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </button>
        </form>
      </main>
    );
  }

  return (
    <>
      
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900">
      <h1 className="text-3xl font-bold mb-6">Comprar Coins com PIX</h1>
      <PixPaymentWithCustomer customerId={asaasCustomerId} userId={user.id} />
    </main>
    </>
  );
}