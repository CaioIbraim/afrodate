'use client';

import { useState, useEffect } from 'react';

interface PixPaymentProps {
  customerId: string | null;
}

export default function PixPaymentWithCustomer({ customerId }: PixPaymentProps) {
  const [qrCode, setQRCode] = useState('');
  const [payload, setPayload] = useState('');
  const [showPix, setShowPix] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Inicia o pagamento
  const handlePagar = async () => {
    if (!customerId) {
      alert('Cliente Asaas não disponível.');
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
      console.log("Pagamento : ", data);

      if (!data.invoiceNumber) {
        setLoading(false);
        alert('Erro ao gerar pagamento.');
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
      alert('Erro ao gerar pagamento.');
    }
  };

  // Copia a chave para área de transferência
  const copyPix = () => {
    navigator.clipboard.writeText(payload).then(() => {
      alert('Chave PIX copiada!');
    });
  };

  // Verifica status do pagamento periodicamente
  const checkStatus = (invoiceNumber : any) => {
    const interval = setInterval(async () => {
      try {

        let id = invoiceNumber
        const res = await fetch(`/api/status-pagamento/${id}`);
        const data = await res.json();

        if (data.status === 'RECEIVED') {
          clearInterval(interval);
          setStatus('success');
        } else if (data.status === 'EXPIRED') {
          clearInterval(interval);
          setStatus('expired');
        }
      } catch (err) {
        console.error('Erro ao verificar status:', err);
      }
    }, 5000);
  };

  return (
    <div className="bg-white p-6 rounded shadow w-full max-w-md text-center">
      <h1 className="text-xl font-semibold mb-4">Pagamento via PIX</h1>

      {/* Removed client selection dropdown */}

      <button
        onClick={handlePagar}
        disabled={loading || !customerId}
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
