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

const MySwal = withReactContent(Swal);

interface PixData {
  payload: string;
  qrCodeUrl: string;
  invoiceNumber: string;
}

function BuyCoinsContent() {
  const router = useRouter();
  const { user, profile, isLoading: userLoading } = useUser();
  const [asaasCustomerId, setAsaasCustomerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cpf, setCpf] = useState("");
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
  }, [user?.id]);

  // Create or retrieve Asaas customer
  const checkAndCreateAsaasUser = async (cpfValue: string) => {
    if (!user || !cpfValue) {
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
          cpf: cpfValue,
          email: user.email,
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

  const handleCpfSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cpf) {
      checkAndCreateAsaasUser(cpf);
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
      // Create payment
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

      // Fetch QR code and payload
      const qrRes = await fetch(`/api/pix-qrcode?id=${invoiceNumber}`);
      const qrData = await qrRes.json();

      setPixData({
        payload: qrData.payload,
        qrCodeUrl: qrData.qrCodeImage,
        invoiceNumber,
      });
      setLoadingPix(false);
      await showAlert("success", "Pix gerado!", "Você pode copiar ou escanear o código para pagar.");

      // Start polling payment status
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
        <Loader2 className="h-8 w-8 animate-spin text-[#00FFD1]" />
        <span className="sr-only">Carregando...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl shadow-md p-6 text-center w-full max-w-2xl"
        >
          <Label className="text-red-500 text-lg font-semibold">Erro: {error}</Label>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl shadow-md p-6 text-center w-full max-w-2xl"
        >
          <Label className="text-lg font-semibold text-neutral-600">
            Por favor, faça login para comprar coins.
          </Label>
        </motion.div>
      </div>
    );
  }

  if (hasActiveSubscription) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 p-6">
        <ProfileHeader name={profile!.name} avatarUrl={profile!.avatar_url} />
        <div className="w-full max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-xl shadow-md p-6 text-center"
          >
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] mb-4">
              Comprar Coins com PIX
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

  if (!asaasCustomerId) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
        <ProfileHeader name={profile!.name} avatarUrl={profile!.avatar_url} />
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-xl shadow-md p-6 w-full max-w-2xl"
          >
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] mb-4 text-center">
              Informar CPF
            </h2>
            <Label className="text-neutral-600 mb-6 text-center">
              Para criar sua conta e processar pagamentos com segurança, precisamos do seu CPF. Esta informação é utilizada exclusivamente pelo nosso parceiro de pagamentos, Asaas, para garantir transações seguras e conformidade com as regulamentações financeiras.
            </Label>
            <form onSubmit={handleCpfSubmit} className="flex flex-col items-center space-y-4">
              <label htmlFor="cpf" className="text-sm font-medium text-neutral-600">
                Por favor, informe seu CPF para continuar:
              </label>
              <input
                type="text"
                id="cpf"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="border border-gray-300 p-3 rounded-xl w-full max-w-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFD1] transition-all duration-200"
                placeholder="Digite seu CPF"
                required
                aria-label="Digite seu CPF"
              />
              <Button
                type="submit"
                className="w-full max-w-sm bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white hover:opacity-90 focus:ring-2 focus:ring-[#00FFD1]"
                disabled={!cpf || isProcessing}
                aria-label="Enviar CPF"
              >
                {isProcessing ? (
                  <span className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processando...
                  </span>
                ) : (
                  <>
                    Enviar CPF
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  if (paymentStep) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 p-6">
        <ProfileHeader name={profile!.name} avatarUrl={profile!.avatar_url} />
        <div className="w-full max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-xl shadow-md p-6 text-center"
          >
            <Button
              onClick={handleBack}
              className="mb-4 bg-transparent text-neutral-600 hover:bg-gray-100"
              aria-label="Voltar"
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              Voltar
            </Button>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] mb-4">
              Pagar com Pix
            </h2>
            <Label className="text-neutral-600 mb-6">
              Plano selecionado: <span className="font-semibold">{selectedPlan?.name}</span>
            </Label>

            <Button
              onClick={generatePixPayment}
              disabled={loadingPix}
              className="w-full bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white hover:opacity-90 focus:ring-2 focus:ring-[#00FFD1] mb-6"
              aria-label="Gerar pagamento Pix"
            >
              {loadingPix ? (
                <span className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Gerando...
                </span>
              ) : (
                <>
                  Gerar Pix
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            {pixData && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <Label className="text-neutral-600 font-medium">
                  Escaneie ou copie a chave para pagar:
                </Label>
                <img
                  src={`data:image/png;base64,${pixData.qrCodeUrl}`}
                  alt="QR Code Pix"
                  className="mx-auto mb-4 w-48 h-48"
                />
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
                  <pre>{pixData.payload}</pre>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white hover:opacity-90 focus:ring-2 focus:ring-[#00FFD1]"
                  onClick={handleCopyPix}
                >
                  Copiar Código Pix
                </Button>
              </motion.div>
            )}

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-neutral-600 font-semibold">Total</h4>
                  <p className="text-neutral-600 text-sm">
                    {selectedPlan?.interval === "year" ? "Cobrança anual" : "Cobrança mensal"}
                  </p>
                </div>
                <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1]">
                  R$ {selectedPlan?.price.toFixed(2).replace(".", ",")}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      <ProfileHeader name={profile!.name} avatarUrl={profile!.avatar_url} />
      <div className="w-full max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] mb-4 text-center">
            Assinal plano
          </h2>
          <Label className="text-neutral-600 mb-6 text-center">
            Escolha o plano ideal para você e aumente suas chances de encontrar sua alma gêmea.
          </Label>
          <div className="space-y-4 mb-6">
            {subscriptionPlans.map((plan) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPlan?.id === plan.id
                    ? "border-[#00FFD1] shadow-lg"
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
                  <div className="absolute -top-3 right-4 bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white text-xs py-1 px-3 rounded-full">
                    Mais Popular
                  </div>
                )}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-600 flex items-center">
                      {plan.tier === "VIP" ? (
                        <Crown className="h-5 w-5 text-amber-500 mr-1" />
                      ) : plan.tier === "PREMIUM" ? (
                        <Star className="h-5 w-5 text-[#00FFD1] mr-1" />
                      ) : null}
                      {plan.name}
                    </h3>
                    <p className="text-neutral-600 text-sm">
                      {plan.interval === "year" ? "Cobrança anual" : "Cobrança mensal"}
                    </p>
                  </div>
                  <div className="flex items-center">
                    {plan.price > 0 ? (
                      <div className="text-right">
                        {plan.discount && (
                          <div className="text-xs text-green-600 font-semibold">
                            Economize {plan.discount}%
                          </div>
                        )}
                        <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1]">
                          R$ {plan.price.toFixed(2).replace(".", ",")}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xl font-bold text-neutral-600">Grátis</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-neutral-600 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                {selectedPlan?.id === plan.id && (
                  <div className="absolute top-2 right-2 bg-[#00FFD1] rounded-full p-1">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
          <div className="p-4 bg-gray-50 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] mb-3">
              Por que fazer upgrade?
            </h3>
            <div className="space-y-2">
              <div className="flex items-start">
                <Check className="h-4 w-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                <p className="text-neutral-600 text-sm">
                  <span className="font-semibold">3x mais matches</span> do que usuários gratuitos
                </p>
              </div>
              <div className="flex items-start">
                <Check className="h-4 w-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                <p className="text-neutral-600 text-sm">
                  <span className="font-semibold">Contato direto via WhatsApp</span> com seus matches (plano VIP)
                </p>
              </div>
              <div className="flex items-start">
                <Check className="h-4 w-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                <p className="text-neutral-600 text-sm">
                  <span className="font-semibold">Destaque no topo da busca</span> para mais visibilidade
                </p>
              </div>
            </div>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white hover:opacity-90 focus:ring-2 focus:ring-[#00FFD1] h-14"
            onClick={handleContinue}
            disabled={!selectedPlan}
            aria-label="Continuar para pagamento"
          >
            Continuar
          </Button>
        </motion.div>
      </div>
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
          <Loader2 className="h-8 w-8 animate-spin text-[#00FFD1]" />
          <span className="sr-only">Carregando...</span>
        </div>
      }
    >
      <BuyCoinsContent />
    </Suspense>
  );
}

// Force dynamic rendering to avoid static generation issues
export const dynamic = "force-dynamic";