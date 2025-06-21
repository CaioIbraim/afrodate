"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase"; // Adjust path as needed
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, Bell, Send } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useUser } from "@/hooks/use-user";

const NotificationCenter = () => {
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const { user, isLoading } = useUser();
 
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setNotifications(data || []);
    };

    fetchNotifications();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        async (payload) => {
          const user = await supabase.auth.getUser();
          if (payload.new.user_id === user.data.user?.id) {
            setNotifications((prev) => [payload.new, ...prev.slice(0, 9)]);
            toast.info(payload.new.message, {
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
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="mt-6 space-y-3" aria-live="polite">
      <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan">
        Notificações Recebidas
      </h3>
      {notifications.length === 0 ? (
        <p className="text-gray-500 text-sm">Nenhuma notificação recebida ainda.</p>
      ) : (
        notifications.map((notification) => (
          <div
            key={notification.id}
            className="p-3 border rounded-md bg-white shadow-sm"
          >
            <p className="text-sm">{notification.message}</p>
            <p className="text-xs text-gray-400">
              {new Date(notification.created_at).toLocaleString("pt-BR")}
            </p>
          </div>
        ))
      )}
    </div>
  );
};

const TestPushNotifications = () => {
  const { user, isLoading } = useUser();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

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
      setIsSubscribed(!!data);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  }, [user]);

  const registerPushSubscription = useCallback(async () => {
    setLoading(true);
    try {
      if (!("serviceWorker" in navigator && "PushManager" in window)) {
        showAlert("error", "Erro", "Notificações push não são suportadas neste navegador.");
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

      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: user!.id,
        subscription: subscription.toJSON(),
      });

      if (error) {
        throw error;
      }

      setIsSubscribed(true);
      showAlert("success", "Sucesso", "Inscrito para notificações push!");
    } catch (error: any) {
      console.error("Push subscription error:", error);
      showAlert("error", "Erro", `Falha ao inscrever: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [user, showAlert]);

  const sendTestNotification = useCallback(async () => {
    if (!user) {
      showAlert("error", "Erro", "Usuário não autenticado.");
      return;
    }
    setSending(true);
    try {
      const message = `Teste de notificação - ${new Date().toLocaleString("pt-BR")}`;
      const { error } = await supabase.from("notifications").insert({
        id: uuidv4(),
        user_id: user.id,
        message,
        created_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      showAlert("success", "Sucesso", "Notificação de teste enviada!");
    } catch (error: any) {
      console.error("Send notification error:", error);
      showAlert("error", "Erro", `Falha ao enviar notificação: ${error.message}`);
    } finally {
      setSending(false);
    }
  }, [user, showAlert]);

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user, checkSubscription]);

  if (!user) {
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
            Testar Notificações Push
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={registerPushSubscription}
            disabled={loading || isSubscribed}
            className="w-full bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white hover:opacity-90 rounded-full"
            aria-label="Ativar notificações push"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Ativando...
              </>
            ) : isSubscribed ? (
              <>
                <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
                Notificações Ativadas
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
                Ativar Notificações
              </>
            )}
          </Button>
          <Button
            onClick={sendTestNotification}
            disabled={sending || !isSubscribed}
            className="w-full bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white hover:opacity-90 rounded-full"
            aria-label="Enviar notificação de teste"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                Enviar Notificação de Teste
              </>
            )}
          </Button>
          <NotificationCenter />
        </CardContent>
      </Card>
    </div>
  );
};

export default TestPushNotifications;
