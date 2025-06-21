"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, Bell } from "lucide-react";

interface Subscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

const CreatePushSubscription = () => {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const showAlert = useCallback(
    (type: "success" | "error", title: string, content: string) => {
      toast[type](`${title}: ${content}`, {
        position: "top-center",
        autoClose: 3000,
        theme: "light",
        style: {
          background: "white",
          border: "2px solid transparent",
          borderRadius: "0.75rem",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }
      });
    },
    []
  );

  const checkSubscription = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("push_subscriptions")
        .select("subscription")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setSubscription(data.subscription as Subscription);
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  }, [user, supabase]);

  const generatePushSubscription = useCallback(async () => {
    if (!user) {
      showAlert("error", "Erro", "Usuário não autenticado.");
      return;
    }
    setIsSubscribing(true);
    try {
      if (!("serviceWorker" in navigator && "PushManager" in window)) {
        showAlert(
          "error",
          "Erro",
          "Notificações push não são suportadas neste navegador."
        );
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        showAlert("error", "Erro", "Permissão de notificações negada.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      });

      const subscriptionJson = subscription.toJSON() as Subscription;
      setSubscription(subscriptionJson);

      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        subscription: subscriptionJson,
      });

      if (error) {
        throw error;
      }

      setIsSubscribed(true);
      showAlert("success", "Sucesso", "Subscrição criada e salva!");
    } catch (error: any) {
      console.error("Error generating subscription:", error);
      showAlert("error", "Erro", `Falha ao criar subscrição: ${error.message}`);
    } finally {
      setIsSubscribing(false);
    }
  }, [user, showAlert, supabase]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      showAlert("error", "Erro", "Por favor, faça login para criar subscrição.");
      router.push("/login");
      return;
    }
    checkSubscription();
  }, [user, isLoading, checkSubscription, showAlert, router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin" aria-label="Carregando" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 flex items-center justify-center">
      <ToastContainer />
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-transparent bg-clip-text">
            Criar Subscrição Push
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={generatePushSubscription}
            disabled={isSubscribing || isSubscribed}
            className="w-full bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white hover:opacity-90 rounded-full"
            aria-label="Criar subscrição push"
          >
            {isSubscribing ? (
              <>
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                Criando...
              </>
            ) : isSubscribed ? (
              <>
                <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
                Subscrição Ativa
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
                Criar Subscrição
              </>
            )}
          </Button>
          {subscription && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan">
                Subscrição JSONB
              </h3>
              <pre className="p-3 bg-gray-50 border rounded-md text-sm overflow-auto">
                {JSON.stringify(subscription, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatePushSubscription;
