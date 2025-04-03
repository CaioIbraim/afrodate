"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Check, Crown, Star } from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { motion } from "framer-motion"
import { subscriptionPlans } from "@/lib/match-utils"
import type { SubscriptionPlan } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"

export default function SubscriptionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [paymentStep, setPaymentStep] = useState(false)

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

  const handleCompletePayment = () => {
    toast({
      title: "Assinatura ativada!",
      description: `Você agora é um usuário ${selectedPlan?.tier === "VIP" ? "VIP" : "Premium"} do ORÁCULO.`,
    })

    setTimeout(() => {
      router.push("/discover")
    }, 1500)
  }

  if (paymentStep) {
    return (
      <div className="app-container">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" className="text-oraculo-muted" onClick={handleBack}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Logo size="sm" />
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1">
          <h2 className="text-2xl font-semibold gradient-text text-center mb-2">Finalizar Pagamento</h2>
          <p className="text-oraculo-muted text-center mb-6">
            Plano selecionado: <span className="font-semibold">{selectedPlan?.name}</span>
          </p>

          <div className="profile-card p-6 mb-6">
            <h3 className="text-xl font-semibold text-oraculo-dark mb-4">Informações de Pagamento</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-oraculo-muted">Número do Cartão</label>
                <input
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  className="w-full p-3 rounded-lg border border-oraculo-purple/30 focus:border-oraculo-purple focus:ring-1 focus:ring-oraculo-purple/30 outline-none"
                />
              </div>

              <div className="flex gap-4">
                <div className="space-y-2 flex-1">
                  <label className="text-sm text-oraculo-muted">Validade</label>
                  <input
                    type="text"
                    placeholder="MM/AA"
                    className="w-full p-3 rounded-lg border border-oraculo-purple/30 focus:border-oraculo-purple focus:ring-1 focus:ring-oraculo-purple/30 outline-none"
                  />
                </div>

                <div className="space-y-2 flex-1">
                  <label className="text-sm text-oraculo-muted">CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full p-3 rounded-lg border border-oraculo-purple/30 focus:border-oraculo-purple focus:ring-1 focus:ring-oraculo-purple/30 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-oraculo-muted">Nome no Cartão</label>
                <input
                  type="text"
                  placeholder="Nome completo"
                  className="w-full p-3 rounded-lg border border-oraculo-purple/30 focus:border-oraculo-purple focus:ring-1 focus:ring-oraculo-purple/30 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="profile-card p-4 mb-6">
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

          <p className="text-xs text-oraculo-muted text-center mb-6">
            Ao confirmar, você concorda com os Termos de Serviço e Política de Privacidade do ORÁCULO. Você pode
            cancelar sua assinatura a qualquer momento.
          </p>
        </motion.div>

        <Button className="w-full gradient-button h-14" onClick={handleCompletePayment}>
          Confirmar Pagamento
        </Button>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" className="text-oraculo-muted" onClick={handleBack}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Logo size="sm" />
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

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
                selectedPlan?.id === plan.id ? "border-2 border-oraculo-purple" : "hover:border-oraculo-purple/50"
              } ${plan.popular ? "relative overflow-visible" : ""}`}
              onClick={() => handleSelectPlan(plan)}
            >
              {plan.popular && (
                <div className="absolute -top-3 right-4 bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white text-xs py-1 px-3 rounded-full">
                  Mais Popular
                </div>
              )}

              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-oraculo-dark flex items-center">
                    {plan.tier === "VIP" ? (
                      <Crown className="h-5 w-5 text-amber-500 mr-1" />
                    ) : plan.tier === "PREMIUM" ? (
                      <Star className="h-5 w-5 text-oraculo-purple mr-1" />
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
                        <div className="text-xs text-green-600 font-semibold">Economize {plan.discount}%</div>
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
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-oraculo-dark text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <div
                className={`w-6 h-6 rounded-full border-2 mt-3 flex items-center justify-center ${
                  selectedPlan?.id === plan.id ? "border-oraculo-purple bg-oraculo-purple/10" : "border-oraculo-muted"
                }`}
              >
                {selectedPlan?.id === plan.id && <div className="w-3 h-3 rounded-full bg-oraculo-purple" />}
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

      <Button className="w-full gradient-button h-14" onClick={handleContinue} disabled={!selectedPlan}>
        Continuar
      </Button>
    </div>
  )
}

