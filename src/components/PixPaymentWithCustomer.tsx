"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const MySwal = withReactContent(Swal);

interface PixPaymentProps {
  customerId: string | null;
  userId: string | null;
}

function PixPaymentContent({ customerId, userId }: PixPaymentProps) {
  const [qrCode, setQRCode] = useState("");
  const [payload, setPayload] = useState("");
  const [showPix, setShowPix] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const router = useRouter();

  const showAlert = async (type: "success" | "error" | "info", title: string, text: string) => {
    return MySwal.fire({
      icon: type,
      title,
      text,
      customClass: {
        popup: "border-2 border-transparent bg-white rounded-2xl shadow-lg w-[90vw] max-w-sm",
        title: "text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-xl font-bold",
        confirmButton: "bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-90",
      },
      willOpen: (popup) => {
        popup.setAttribute("aria-live", "assertive");
      },
    });
  };

  // Check for active subscription on mount
  useEffect(() => {
    const checkSubscription = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("ends_at, is_active")
          .eq("user_id", userId)
          .eq("is_active", true)
          .gte("ends_at", new Date().toISOString())
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116: No rows found
          console.error("Erro ao verificar assinatura:", error);
          await showAlert("error", "Erro", "Erro ao verificar assinatura ativa. Por favor, entre em contato com o suporte.");
          return;
        }

        if (data) {
          setHasActiveSubscription(true);
        }
      } catch (err) {
        console.error("Erro ao verificar assinatura:", err);
        await showAlert("error", "Erro", "Erro ao verificar assinatura ativa. Por favor, entre em contato com o suporte.");
      }
    };

    checkSubscription();
  }, [userId]);

  // Inicia o pagamento
  const handlePagar = async () => {
    if (!customerId || !userId) {
      await showAlert("error", "Erro", "Cliente Asaas ou ID de usuário não disponível. Por favor, entre em contato com o suporte.");
      return;
    }

    setStatus("");
    setShowPix(false);
    setQRCode("");
    setPayload("");
    setLoading(true);
    localStorage.removeItem("paymentId");

    try {
      // Cria cobrança
      const res = await fetch("/api/gerar-pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });

      const data = await res.json();
      console.log("Pagamento:", data);

      if (!data.invoiceNumber) {
        setLoading(false);
        await showAlert("error", "Erro", "Erro ao gerar pagamento. Por favor, entre em contato com o suporte.");
        return;
      }

      const invoiceNumber = data.invoiceNumber;
      localStorage.setItem("paymentId", invoiceNumber);

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
      console.error("Erro ao gerar cobrança:", err);
      await showAlert("error", "Erro", "Erro ao gerar pagamento. Por favor, entre em contato com o suporte.");
    }
  };

  // Copia a chave para área de transferência
  const handleCopyPix = () => {
    navigator.clipboard.writeText(payload).then(() => {
      showAlert("success", "Sucesso", "Chave PIX copiada!").then(() => {
        // Optional: Add a timer to close the alert automatically
      });
    });
  };

  // Verifica status do pagamento periodicamente
  const checkStatus = (invoiceNumber: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status-pagamento/${invoiceNumber}?userId=${userId}`);
        const data = await res.json();
        console.log("Payment status:", data.status);

        if (data.status === "RECEIVED" && data.updated) {
          clearInterval(interval);
          setStatus("success");
          await showAlert("success", "Sucesso", "Assinatura atualizada com sucesso!");
          router.push("/discover/v6");
        } else if (data.status === "RECEIVED" && !data.updated) {
          clearInterval(interval);
          setStatus("error");
          await showAlert("error", "Erro", "Erro ao atualizar assinatura. Por favor, entre em contato com o suporte.");
        } else if (data.status === "EXPIRED") {
          clearInterval(interval);
          setStatus("expired");
          await showAlert("error", "Erro", "O pagamento expirou.");
        } else if (data.error) {
          clearInterval(interval);
          setStatus("error");
          await showAlert("error", "Erro", `${data.error}`);
        }
      } catch (err) {
        console.error("Erro ao verificar status:", err);
        await showAlert("error", "Erro", "Erro ao verificar status do pagamento. Por favor, entre em contato com o suporte.");
      }
    }, 5000);
  };

  if (hasActiveSubscription) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 p-6">
        <div className="w-full max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-xl shadow-md p-6 text-center"
          >
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] mb-4">
              Pagamento via PIX
            </h2>
            <Label className="text-neutral-600 text-lg font-semibold flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-[#00FFD1] mr-2" />
              Você já possui uma assinatura ativa!
            </Label>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      <div className="w-full max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl shadow-md p-6 text-center"
        >
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] mb-4">
            Pagamento via PIX
          </h2>
          <Label className="text-neutral-600 mb-6">
            Escaneie o QR Code ou copie a chave PIX para realizar o pagamento de R$ 29,90.
          </Label>

          <Button
            onClick={handlePagar}
            disabled={loading || !customerId || !userId}
            className="w-full bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white hover:opacity-90 focus:ring-2 focus:ring-[#00FFD1] mb-6"
            aria-label="Iniciar pagamento via PIX"
          >
            {loading ? (
              <span className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Gerando cobrança...
              </span>
            ) : (
              <>
                Pagar R$ 29,90
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          {showPix && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <Label className="text-neutral-600 font-medium">
                Escaneie ou copie a chave para pagar:
              </Label>

              {qrCode && (
                <img
                  src={`data:image/png;base64,${qrCode}`}
                  alt="QR Code PIX"
                  className="mx-auto mb-4 w-48 h-48"
                />
              )}

              <div
                onClick={handleCopyPix}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCopyPix();
                  }
                }}
                className="cursor-pointer bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto hover:bg-gray-200 transition"
                role="button"
                tabIndex={0}
                aria-label="Copiar chave PIX"
              >
                <pre>{payload}</pre>
              </div>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="mt-4 flex items-center justify-center text-[#00FFD1] font-bold"
            >
              <CheckCircle2 className="h-6 w-6 mr-2" />
              Pagamento confirmado com sucesso!
            </motion.div>
          )}

          {status === "expired" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="mt-4 flex items-center justify-center text-red-600 font-bold"
            >
              <svg
                className="h-6 w-6 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              O pagamento expirou.
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function PixPaymentWithCustomer({ customerId, userId }: PixPaymentProps) {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100"
          aria-live="polite"
        >
          <Loader2 className="h-8 w-8 animate-spin text-[#00FFD1]" />
          <span className="sr-only">Carregando...</span>
        </div>
      }
    >
      <PixPaymentContent customerId={customerId} userId={userId} />
    </Suspense>
  );
}

// Force dynamic rendering to avoid static generation issues
export const dynamic = "force-dynamic";