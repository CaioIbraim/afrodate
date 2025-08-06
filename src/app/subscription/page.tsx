"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/use-user";
import { Loader2, CheckCircle2, ChevronLeft, Crown, Star, Check } from "lucide-react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { subscriptionPlans } from "@/lib/match-utils";
import type { SubscriptionPlan } from "@/lib/types";
import { ProfileHeader } from "@/components/profile-header";
import { supabase } from "@/lib/supabase";
import { MobileFooterMenu } from "@/components/MobileFooterMenu";

const MySwal = withReactContent(Swal);

interface PixData {
  payload: string;
  qrCodeUrl: string;
  invoiceNumber: string;
}

// --- MELHORIA 1: Função helper para encurtar a chave PIX ---
const truncatePix = (pixKey: string, start = 15, end = 15) => {
  if (!pixKey || pixKey.length <= start + end) {
    return pixKey;
  }
  return `${pixKey.substring(0, start)}...${pixKey.substring(pixKey.length - end)}`;
};


function BuyCoinsContent() {
  const router = useRouter();
  const { user, profile, isLoading: userLoading } = useUser();
  const [asaasCustomerId, setAsaasCustomerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cpf, setCpf] = useState("14434463780"); // Lembre-se de substituir por um método dinâmico
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentStep, setPaymentStep] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  const showAlert = async (type: "success" | "error" | "info", title: string, text: string) => {
    return MySwal.fire({
      icon: type,
      title,
      text,
      customClass: {
        popup: "border-2 border-transparent bg-white rounded-2xl shadow-xl w-[90vw] max-w-md",
        title: "text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1]",
        confirmButton:
          "bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-90 transition",
        
      },
      willOpen: (popup) => {
        popup.setAttribute("aria-live", "assertive");
      },
    });
  };

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("ends_at, is_active")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .gte("ends_at", new Date().toISOString())
          .single();

        if (error && error.code !== "PGRST116") {
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
    if (user && cpf) {
      checkAndCreateAsaasUser();
    }
  }, [user?.id, cpf]);

  const checkAndCreateAsaasUser = async () => {
    if (!user || !cpf) {
      await showAlert("error", "Erro", "Usuário ou CPF não fornecido.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/check-and-create-asaas-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profile?.name || "Usuário",
          cpf: cpf,
          email: user!.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.customerId) {
          setAsaasCustomerId(data.customerId);
        }
      } else {
        setError(data.error || "Erro ao processar cliente.");
        await showAlert("error", "Erro", data.error || "Erro ao processar cliente.");
      }
    } catch (error) {
      console.error("Error fetching Asaas customer ID:", error);
      setError("Erro ao processar cliente.");
      await showAlert("error", "Erro", "Erro ao processar cliente. Por favor, tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
  };

  const handleContinue = () => {
    if (!selectedPlan) {
      showAlert("error", "Selecione um plano", "Por favor, selecione um plano para continuar.");
      return;
    }
    setPaymentStep(true);
  };

  const handleBack = () => {
    if (paymentStep) {
      setPaymentStep(false);
    } else {
      router.back();
    }
  };

  const generatePixPayment = async () => {
    if (!selectedPlan || !asaasCustomerId) {
      await showAlert("error", "Erro", "Plano ou ID do cliente não encontrado.");
      return;
    }

    setLoadingPix(true);
    setPixData(null);

    try {
      const res = await fetch("/api/gerar-pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: asaasCustomerId }),
      });

      const data = await res.json();

      if (!data.invoiceNumber) {
        throw new Error("Erro ao gerar pagamento. Por favor, entre em contato com o suporte.");
      }

      const invoiceNumber = data.invoiceNumber;
      localStorage.setItem("paymentId", invoiceNumber);

      const qrRes = await fetch(`/api/pix-qrcode?id=${invoiceNumber}`);
      const qrData = await qrRes.json();

      setPixData({
        payload: qrData.payload,
        qrCodeUrl: qrData.qrCodeImage,
        invoiceNumber,
      });
      setLoadingPix(false);
      await showAlert("success", "Pix gerado!", "Você pode copiar ou escanear o código para pagar.");

      checkStatus(invoiceNumber);
    } catch (err: any) {
      setLoadingPix(false);
      console.error("Erro ao gerar cobrança:", err);
      await showAlert("error", "Erro", err.message || "Erro ao gerar pagamento. Por favor, entre em contato com o suporte.");
    }
  };

  const handleCopyPix = () => {
    if (pixData?.payload) {
      navigator.clipboard.writeText(pixData.payload).then(() => {
        showAlert("success", "Sucesso", "Chave PIX copiada!");
      });
    }
  };

  const checkStatus = (invoiceNumber: string) => {
    // Lembrete: Considere usar Supabase Realtime para uma solução mais eficiente.
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status-pagamento/${invoiceNumber}?userId=${user?.id}`);
        const data = await res.json();
        console.log("Payment status:", data.status);

        if (data.status === "RECEIVED" && data.updated) {
          clearInterval(interval);
          await showAlert("success", "Sucesso", "Assinatura atualizada com sucesso!");
          router.push("/discover/v6");
        } else if (data.status === "RECEIVED" && !data.updated) {
          clearInterval(interval);
          await showAlert("error", "Erro", "Erro ao atualizar assinatura. Por favor, entre em contato com o suporte.");
        } else if (data.status === "EXPIRED") {
          clearInterval(interval);
          await showAlert("error", "Erro", "O pagamento expirou.");
        } else if (data.error) {
          clearInterval(interval);
          await showAlert("error", "Erro", `${data.error}`);
        }
      } catch (err) {
        console.error("Erro ao verificar status:", err);
        await showAlert("error", "Erro", "Erro ao verificar status do pagamento. Por favor, entre em contato com o suporte.");
      }
    }, 5000);
  };

  if (userLoading || isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100" aria-live="polite">
        <Loader2 className="h-10 w-10 animate-spin text-[#00FFD1]" />
        <span className="sr-only">Carregando...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center w-full max-w-md"
        >
          <h2 className="text-xl font-bold text-red-500 mb-4">Erro</h2>
          <Label className="text-neutral-600">{error}</Label>
          <Button
            className="mt-6 bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white hover:opacity-90"
            onClick={() => router.back()}
            aria-label="Voltar"
          >
            Voltar
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center w-full max-w-md"
        >
          <h2 className="text-xl font-bold text-neutral-600 mb-4">Faça Login</h2>
          <Label className="text-neutral-600">Por favor, faça login para comprar coins.</Label>
          <Button
            className="mt-6 bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white hover:opacity-90"
            onClick={() => router.push("/login")}
            aria-label="Ir para login"
          >
            Fazer Login
          </Button>
        </motion.div>
      </div>
    );
  }

  if (hasActiveSubscription) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6">
        <ProfileHeader name={profile!.name} avatarUrl={profile!.avatar_url} />
        <div className="w-full max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center"
          >
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] mb-4">
              Assinatura Ativa
            </h2>
            <Label className="text-neutral-600 text-lg flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-[#00FFD1] mr-2" />
              Você já possui uma assinatura ativa!
            </Label>
            <Button
              className="mt-6 bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white hover:opacity-90"
              onClick={() => router.push("/discover/v6")}
              aria-label="Ir para Discover"
            >
              Explorar
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (paymentStep) {
    return (
      // --- MELHORIA 2: Espaçamento responsivo (p-4 para mobile, p-6 para telas maiores) ---
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
        <ProfileHeader name={profile!.name} avatarUrl={profile!.avatar_url} />
        <div className="w-full max-w-3xl mx-auto p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-xl p-6 sm:p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <Button
                onClick={handleBack}
                className="bg-transparent text-neutral-600 hover:bg-gray-100"
                aria-label="Voltar"
              >
                <ChevronLeft className="h-5 w-5 mr-2" />
                Voltar
              </Button>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1]">
                Pagar com Pix
              </h2>
              <div className="w-12" /> {/* Spacer */}
            </div>
            <div className="text-center mb-6">
              <Label className="text-neutral-600 text-lg">
                Plano selecionado: <span className="font-semibold">{selectedPlan?.name}</span>
              </Label>
            </div>

            <div className="flex justify-center mb-6">
              <Button
                onClick={generatePixPayment}
                disabled={loadingPix}
                className="w-full max-w-xs bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white hover:opacity-90 focus:ring-2 focus:ring-[#00FFD1] h-12"
                aria-label="Gerar pagamento Pix"
              >
                {loadingPix ? (
                  <span className="flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Gerando...
                  </span>
                ) : (
                  <>
                    Gerar Pix
                    <CheckCircle2 className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
            
            {/* --- MELHORIA 3: Bloco PIX completamente refeito para melhor UX e responsividade --- */}
            {pixData && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 text-center"
              >
                <Label className="text-neutral-600 text-lg font-medium">
                  Escaneie o QR Code ou copie a chave abaixo:
                </Label>
                
                <div className="flex justify-center">
                  <img
                    src={`data:image/png;base64,${pixData.qrCodeUrl}`}
                    alt="QR Code Pix"
                    className="w-56 h-56 md:w-64 md:h-64 rounded-lg shadow-md"
                  />
                </div>
                
                <div className="bg-gray-100 p-4 rounded-lg space-y-3">
                  <Label className="text-sm text-neutral-500">Chave PIX Copia e Cola</Label>
                  <p 
                    className="text-sm text-neutral-700 font-mono bg-white p-3 rounded border border-gray-200"
                    style={{ wordBreak: 'break-all' }} 
                  >
                    {truncatePix(pixData.payload)}
                  </p>
                </div>

                <Button
                  className="w-full max-w-xs bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white hover:opacity-90 focus:ring-2 focus:ring-[#00FFD1] h-12"
                  onClick={handleCopyPix}
                  aria-label="Copiar código Pix"
                >
                  Copiar Código Pix
                </Button>
              </motion.div>
            )}

            <div className="mt-8 p-4 sm:p-6 bg-gray-50 rounded-lg shadow-inner">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-lg font-semibold text-neutral-600">Total</h4>
                  <p className="text-neutral-600 text-sm">
                    {selectedPlan?.interval === "year" ? "Cobrança anual" : "Cobrança mensal"}
                  </p>
                </div>
                <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1]">
                  R$ {selectedPlan?.price.toFixed(2).replace(".", ",")}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        <MobileFooterMenu/>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 ">
      <ProfileHeader name={profile!.name} avatarUrl={profile!.avatar_url} />
      <div className="w-full h-screen max-w-3xl mx-auto mt-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-xl p-6 sm:p-8"
        >
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] mb-4 text-center">
            Seja Premium
          </h2>
          <Label className="text-neutral-600 text-lg mb-8 text-center block">
            Selecione o plano ideal para turbinar suas conexões e encontrar sua alma gêmea.
          </Label>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {subscriptionPlans.map((plan) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`relative p-6 rounded-lg border-2 bg-white shadow-md cursor-pointer transition-all hover:shadow-lg ${
                  selectedPlan?.id === plan.id
                    ? "border-[#00FFD1] ring-2 ring-[#00FFD1]/50"
                    : "border-gray-200 hover:border-oraculo-cyan"
                }`}
                role="button"
                tabIndex={0}
                aria-label={`Selecionar plano ${plan.name}`}
                onClick={() => handleSelectPlan(plan)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectPlan(plan);
                  }
                }}
                
              >
                {plan?.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white text-xs py-1 px-3 rounded-full shadow-sm">
                    Mais Popular
                  </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-600 flex items-center">
                      {plan.tier === "VIP" ? (
                        <Crown className="h-5 w-5 text-amber-500 mr-2" />
                      ) : plan.tier === "PREMIUM" ? (
                        <Star className="h-5 w-5 text-[#00FFD1] mr-2" />
                      ) : null}
                      {plan.name}
                    </h3>
                    <p className="text-neutral-600 text-sm">
                      {plan.interval === "year" ? "Cobrança anual" : "Cobrança mensal"}
                    </p>
                  </div>
                  <div className="text-right">
                    {plan.price > 0 ? (
                      <>
                        {plan.discount && (
                          <div className="text-xs text-green-600 font-semibold mb-1">
                            Economize {plan.discount}%
                          </div>
                        )}
                        <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1]">
                          R$ {plan.price.toFixed(2).replace(".", ",")}
                        </div>
                      </>
                    ) : (
                      <div className="text-2xl font-bold text-neutral-600">Grátis</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <Check className="h-4 w-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                      <span className="text-neutral-600 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                {selectedPlan?.id === plan.id && (
                  <div className="absolute top-4 right-4 bg-[#00FFD1] rounded-full p-1.5">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>


{/**
          <div className="p-4 sm:p-6 bg-gray-50 rounded-lg shadow-inner mb-8">
            <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] mb-4">
              Por que fazer upgrade?
            </h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                <p className="text-neutral-600 text-base">
                  <span className="font-semibold">3x mais matches</span> do que usuários gratuitos
                </p>
              </div>
              <div className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                <p className="text-neutral-600 text-base">
                  <span className="font-semibold">Contato direto via WhatsApp</span> com seus matches (plano VIP)
                </p>
              </div>
              <div className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                <p className="text-neutral-600 text-base">
                  <span className="font-semibold">Destaque no topo da busca</span> para mais visibilidade
                </p>
              </div>
            </div>
          </div>
 */}



            
          <Button
            className="w-full bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white hover:opacity-90 focus:ring-2 focus:ring-[#00FFD1] h-12 text-lg"
            onClick={handleContinue}
            disabled={!selectedPlan}
            aria-label="Continuar para pagamento"
          >
            Continuar
          </Button>



        </motion.div>
      </div>
      <MobileFooterMenu/>
    </div>
  );
}

export default function BuyCoinsPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100"
          aria-live="polite"
        >
          <Loader2 className="h-10 w-10 animate-spin text-[#00FFD1]" />
          <span className="sr-only">Carregando...</span>
        </div>
      }
    >
      <BuyCoinsContent />
    </Suspense>
  );
}

export const dynamic = "force-dynamic";