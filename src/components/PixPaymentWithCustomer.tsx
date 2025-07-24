'use client';

import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

interface PixPaymentProps {
  customerId: string | null;
  userId: string | null;
}

export default function PixPaymentWithCustomer({ customerId, userId }: PixPaymentProps) {
  const [qrCode, setQRCode] = useState('');
  const [payload, setPayload] = useState('');
  const [showPix, setShowPix] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const router = useRouter();

  // Check for active subscription on mount
  useEffect(() => {
    const checkSubscription = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('ends_at, is_active')
          .eq('user_id', userId)
          .eq('is_active', true)
          .gte('ends_at', new Date().toISOString())
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: No rows found
          console.error('Erro ao verificar assinatura:', error);
          Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Erro ao verificar assinatura ativa. Por favor, entre em contato com o suporte.',
          });
          return;
        }

        if (data) {
          setHasActiveSubscription(true);
        }
      } catch (err) {
        console.error('Erro ao verificar assinatura:', err);
        Swal.fire({
          icon: 'error',
          title: 'Erro',
          text: 'Erro ao verificar assinatura ativa. Por favor, entre em contato com o suporte.',
        });
      }
    };

    checkSubscription();
  }, [userId]);

  // Inicia o pagamento
  const handlePagar = async () => {
    if (!customerId || !userId) {
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Cliente Asaas ou ID de usuário não disponível. Por favor, entre em contato com o suporte.',
      });
      return;
    }

    setStatus('');
    setShowPix(false);
    setQRCode('');
    setPayload('');
    setLoading(true);
    localStorage.removeItem('paymentId');

    try {
      // Cria cobrança
      const res = await fetch('/api/gerar-pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customerId }),
      });

      const data = await res.json();
      console.log("Pagamento:", data);

      if (!data.invoiceNumber) {
        setLoading(false);
        Swal.fire({
          icon: 'error',
          title: 'Erro',
          text: 'Erro ao gerar pagamento. Por favor, entre em contato com o suporte.',
        });
        return;
      }

      const invoiceNumber = data.invoiceNumber;
      localStorage.setItem('paymentId', invoiceNumber);

      // Busca QR Code e chave
      const qrRes = await fetch(`/api/pix-qrcode?id=${invoiceNumber}`);
      const qrData = await qrRes.json();

      setQRCode(qrData.qrCodeImage);
      setPayload(qrData.payload);
      setShowPix(true);
      setLoading(false);

      // Verifica status em loop
      checkStatus(invoiceNumber);
    } catch (err) {
      setLoading(false);
      console.error('Erro ao gerar cobrança:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao gerar pagamento. Por favor, entre em contato com o suporte.',
      });
    }
  };

  // Copia a chave para área de transferência
  const copyPix = () => {
    navigator.clipboard.writeText(payload).then(() => {
      Swal.fire({
        icon: 'success',
        title: 'Sucesso',
        text: 'Chave PIX copiada!',
        timer: 1500,
        showConfirmButton: false,
      });
    });
  };

  // Verifica status do pagamento periodicamente
  const checkStatus = (invoiceNumber: any) => {
    const interval = setInterval(async () => {
      try {
        const id = invoiceNumber;
        const res = await fetch(`/api/status-pagamento/${id}?userId=${userId}`);
        const data = await res.json();
        console.log('Payment status:', data.status); // Debug payment status

        if (data.status === 'RECEIVED' && data.updated) {
          clearInterval(interval);
          setStatus('success');
          // Redirect to /discover/v6 on successful update
          Swal.fire({
            icon: 'success',
            title: 'Sucesso',
            text: 'Assinatura atualizada com sucesso!',
          });
          router.push('/discover/v6');
        } else if (data.status === 'RECEIVED' && !data.updated) {
          clearInterval(interval);
          setStatus('error');
          Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Erro ao atualizar assinatura. Por favor, entre em contato com o suporte.',
          });
        } else if (data.status === 'EXPIRED') {
          clearInterval(interval);
          setStatus('expired');
        } else if (data.error) {
          clearInterval(interval);
          setStatus('error');
          Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: `${data.error}`,
          });
        }
      } catch (err) {
        console.error('Erro ao verificar status:', err);
        Swal.fire({
          icon: 'error',
          title: 'Erro',
          text: 'Erro ao verificar status do pagamento. Por favor, entre em contato com o suporte.',
        });
      }
    }, 5000);
  };

  if (hasActiveSubscription) {
    return (
      <div className="bg-white p-6 rounded shadow w-full max-w-md text-center">
        <h1 className="text-xl font-semibold mb-4">Pagamento via PIX</h1>
        <p className="text-green-600 font-bold">
          ✅ Você já possui uma assinatura ativa!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded shadow w-full max-w-md text-center">
      <h1 className="text-xl font-semibold mb-4">Pagamento via PIX</h1>

      <button
        onClick={handlePagar}
        disabled={loading || !customerId || !userId}
        className={`bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition ${
          loading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {loading ? 'Gerando cobrança...' : 'Pagar R$ 29,90'}
      </button>

      {showPix && (
        <>
          <p className="mt-6 mb-2 font-medium">Escaneie ou copie a chave para pagar:</p>

          {qrCode && (
            <img
              src={`data:image/png;base64,${qrCode}`}
              alt="QR Code PIX"
              className="mx-auto mb-4 w-48 h-48"
            />
          )}

          <pre
            onClick={copyPix}
            className="cursor-pointer bg-gray-100 p-2 rounded text-sm overflow-x-auto"
          >
            {payload}
          </pre>
        </>
      )}

      {status === 'success' && (
        <div className="mt-4 text-green-600 font-bold">
          ✅ Pagamento confirmado com sucesso!
        </div>
      )}

      {status === 'expired' && (
        <div className="mt-4 text-red-600 font-bold">
          ❌ O pagamento expirou.
        </div>
      )}
    </div>
  );
}
