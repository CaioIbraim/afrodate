"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Check, Crown, Star } from "lucide-react"
import { motion } from "framer-motion"
import { subscriptionPlans } from "@/lib/match-utils"
import type { SubscriptionPlan } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"
import { ProfileHeader } from "@/components/profile-header"
import { useUser } from "@/hooks/use-user"

// Definindo a interface para os dados do Pix
interface PixData {
  payload: string
  qrCodeUrl: string
}

export default function SubscriptionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, profile, isLoading: userLoading } = useUser()

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [paymentStep, setPaymentStep] = useState(false)
  const [pixData, setPixData] = useState<PixData | null>(null)
  const [loadingPix, setLoadingPix] = useState(false)

  const handleBack = () => {
    if (paymentStep) {
      setPaymentStep(false)
    } else {
      router.back()
    }
  }

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan)
  }

  const handleContinue = () => {
    if (!selectedPlan) {
      toast({
        title: "Selecione um plano",
        description: "Por favor, selecione um plano para continuar.",
        variant: "destructive",
      })
      return
    }
    setPaymentStep(true)
  }

  const generatePixPayment = async () => {
    if (!selectedPlan || !profile?.customerId) {
      toast({
        title: "Erro",
        description: "Plano ou ID do cliente não encontrado.",
        variant: "destructive",
      })
      return
    }

    setLoadingPix(true)
    try {
      const response = await fetch('/api/asaas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valor: selectedPlan.price,
          descricao: `${selectedPlan.name} - ${selectedPlan.interval}`,
          customerId: profile.customerId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar Pix')
      }

      // Verifique se os dados retornados têm as propriedades esperadas
      if (!data.payload || !data.qrCodeUrl) {
        throw new Error('Resposta da API incompleta: payload ou qrCodeUrl ausentes')
      }

      setPixData({ payload: data.payload, qrCodeUrl: data.qrCodeUrl })
      toast({
        title: "Pix gerado!",
        description: "Você pode copiar ou escanear o código para pagar.",
      })
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Erro desconhecido ao gerar Pix",
        variant: "destructive",
      })
    } finally {
      setLoadingPix(false)
    }
  }

  const handleConfirmPayment = () => {
    toast({
      title: "Pagamento confirmado!",
      description: "Seu plano foi ativado com sucesso.",
    })
    setTimeout(() => {
      router.push("/profile")
    }, 1500)
  }

  if (userLoading || !profile) {
    return (
      <div className="app-container flex items-center justify-center h-screen">
        <p className="text-oraculo-muted">Carregando...</p>
      </div>
    )
  }

  if (paymentStep) {
    return (
      <div className="app-container">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1">
          <h2 className="text-2xl font-semibold gradient-text text-center mb-2">Pagar com Pix</h2>
          <p className="text-oraculo-muted text-center mb-6">
            Plano selecionado: <span className="font-semibold">{selectedPlan?.name}</span>
          </p>

          <div className="profile-card p-6 mb-6 text-center">
            <p className="mb-4">Escaneie o QR Code abaixo para realizar o pagamento:</p>
            <button
              onClick={generatePixPayment}
              disabled={loadingPix}
              className="px-4 py-2 bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white rounded-lg"
            >
              {loadingPix ? "Gerando..." : "Gerar Pix"}
            </button>

            {pixData && (
              <>
                <img src={pixData.qrCodeUrl} alt="QR Code Pix" className="mx-auto my-4 max-w-xs" />
                <textarea
                  readOnly
                  value={pixData.payload}
                  className="w-full p-2 border border-gray-300 rounded mt-2 text-sm"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  className="mt-2 w-full gradient-button"
                  onClick={() => navigator.clipboard.writeText(pixData.payload)}
                >
                  Copiar Código Pix
                </Button>
              </>
            )}

            <div className="profile-card p-4 mt-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-oraculo-dark font-semibold">Total</h4>
                  <p className="text-oraculo-muted text-sm">
                    {selectedPlan?.interval === "year" ? "Cobrança anual" : "Cobrança mensal"}
                  </p>
                </div>
                <div className="text-xl font-bold gradient-text">
                  R$ {selectedPlan?.price.toFixed(2).replace(".", ",")}
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-oraculo-muted text-center mb-6">
            Após escanear, finalize o pagamento no app do seu banco.
          </p>
        </motion.div>

        <Button className="w-full gradient-button h-14" onClick={handleConfirmPayment}>
          Confirmar Pagamento
        </Button>
      </div>
    )
  }

  return (
    <>
      <ProfileHeader name={profile.name} avatarUrl={profile.avatar_url} />
      <div className="app-container">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1">
          <h2 className="text-2xl font-semibold gradient-text text-center mb-2">Desbloqueie Todo o Potencial</h2>
          <p className="text-oraculo-muted text-center mb-6">
            Escolha o plano ideal para você e aumente suas chances de encontrar sua alma gêmea
          </p>
          <div className="space-y-4 mb-6">
            {subscriptionPlans.map((plan) => (
              <div
                key={plan.id}
                className={`profile-card p-4 cursor-pointer transition-all ${
                  selectedPlan?.id === plan.id
                    ? "border-2 border-[#00FFD1]"
                    : "hover:border-[#00FFD1]/50"
                } ${plan?.popular ? "relative overflow-visible" : ""}`}
                onClick={() => handleSelectPlan(plan)}
              >
                {plan?.popular && (
                  <div className="absolute -top-3 right-4 bg-gradient-to-r from-oraculo-cyan to-[#00FFD1] text-white text-xs py-1 px-3 rounded-full">
                    Mais Popular
                  </div>
                )}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-oraculo-dark flex items-center">
                      {plan.tier === "VIP" ? (
                        <Crown className="h-5 w-5 text-amber-500 mr-1" />
                      ) : plan.tier === "PREMIUM" ? (
                        <Star className="h-5 w-5 text-[#00FFD1] mr-1" />
                      ) : null}
                      {plan.name}
                    </h3>
                    <p className="text-oraculo-muted text-sm">
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
                        <div className="text-xl font-bold gradient-text">
                          R$ {plan.price.toFixed(2).replace(".", ",")}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xl font-bold text-oraculo-muted">Grátis</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-oraculo-dark text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 mt-3 flex items-center justify-center ${
                    selectedPlan?.id === plan.id
                      ? "border-[#00FFD1] bg-[#00FFD1]/10"
                      : "border-oraculo-muted"
                  }`}
                >
                  {selectedPlan?.id === plan.id && (
                    <div className="w-3 h-3 rounded-full bg-[#00FFD1]" />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="profile-card p-4 mb-6">
            <h3 className="text-lg font-semibold gradient-text mb-3">Por que fazer upgrade?</h3>
            <div className="space-y-2">
              <div className="flex items-start">
                <Check className="h-4 w-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                <p className="text-oraculo-dark text-sm">
                  <span className="font-semibold">3x mais matches</span> do que usuários gratuitos
                </p>
              </div>
              <div className="flex items-start">
                <Check className="h-4 w-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                <p className="text-oraculo-dark text-sm">
                  <span className="font-semibold">Contato direto via WhatsApp</span> com seus matches (plano VIP)
                </p>
              </div>
              <div className="flex items-start">
                <Check className="h-4 w-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                <p className="text-oraculo-dark text-sm">
                  <span className="font-semibold">Destaque no topo da busca</span> para mais visibilidade
                </p>
              </div>
            </div>
          </div>
        </motion.div>
        <Button
          className="w-full gradient-button h-14"
          onClick={handleContinue}
          disabled={!selectedPlan}
        >
          Continuar
        </Button>
      </div>
    </>
  )
}