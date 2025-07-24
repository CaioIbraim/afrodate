'use client'
import PixPaymentWithCustomer from '@/components/PixPaymentWithCustomer';
import { useState } from 'react';
import { useUser } from '@/hooks/use-user';

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
          email : user.email
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
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
        <p>Carregando...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
        <p className="text-red-500">Erro: {error}</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
        <p>Por favor, faça login para comprar coins.</p>
      </main>
    );
  }

  if (!asaasCustomerId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
        <h1 className="text-2xl font-bold mb-6">Informar CPF</h1>
        <form onSubmit={handleCpfSubmit} className="flex flex-col items-center">
          <label htmlFor="cpf" className="mb-2">Por favor, informe seu CPF para continuar:</label>
          <input
            type="text"
            id="cpf"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            className="border p-2 rounded mb-4 w-64"
            placeholder="Digite seu CPF"
            required
          />
          <button 
            type="submit" 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
            disabled={!cpf}
          >
            Enviar CPF
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
      <h1 className="text-2xl font-bold mb-6">Comprar Coins com PIX</h1>
      <PixPaymentWithCustomer customerId={asaasCustomerId} userId={user.id} />
    </main>
  );
}