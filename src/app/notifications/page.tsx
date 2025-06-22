"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { messaging, getToken, onMessage } from "@/lib/firebase";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Bell, Loader2, CheckCircle, XCircle } from "lucide-react";
import Swal from "sweetalert2";
import { FaWhatsapp } from "react-icons/fa";
import type { MessagePayload } from "firebase/messaging";

// Constants
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const ROUTES = {
  LOGIN: "/login",
  PROFILE: "/profile",
};

export default function NotificationsPage() {
  const { user, isLoading: userLoading, profile } = useUser();
  const router = useRouter();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<MessagePayload | null>(null);

  // Check if notifications are supported
  const isNotificationSupported =
    typeof window !== "undefined" && "Notification" in window && messaging;

  // Request notification permission and get FCM token
  const handleEnableNotifications = async () => {
    if (!isNotificationSupported) {
     
      Swal.fire("Erro", "Notificações não são suportadas neste navegador.", "error");

      return;
    }

    if (!user || !profile) {
      Swal.fire("Erro", "Faça login para ativar notificações.", "error");

      router.push(ROUTES.LOGIN);
      return;
    }


    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permissão de notificação negada.");
      }

      const currentToken = await getToken(messaging!, { vapidKey: VAPID_KEY }); // Added non-null assertion
      if (!currentToken) {
        throw new Error("Não foi possível obter o token FCM.");
      }

      console.log("FCM Token:", currentToken); // Log the token

      // Store token in Supabase
      const { error } = await supabase.from("tokens").upsert({
        user_id: user.id,
        profile_id: profile.id,
        fcm_token: currentToken,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(), // Add updated_at for upsert
      });

      if (error) throw error;
      console.log("Supabase upsert result:", { error }); // Log the upsert result

      setToken(currentToken);
    
      Swal.fire("Sucesso", "Notificações ativadas com sucesso!", "success");
    } catch (error: any) {
     
      Swal.fire("Erro", error.message || "Falha ao ativar notificações.", "error");
    } finally {
      setIsSubscribing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
      if (payload.notification) {
        setNotification(payload);
        
        Swal.fire({
          title: payload.notification.title || "Nova Notificação",
          text: payload.notification.body || "Você recebeu uma mensagem.",
          icon: "info",

      })
    }
    });

    return () => unsubscribe();
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!userLoading && !user) {
      router.push(ROUTES.LOGIN);
    }
  }, [user, userLoading, router]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-oraculo-purple" />
      </div>
    );
  }

  return (
    <div className="app-container flex flex-col min-h-screen px-4 py-6 bg-gray-50">
      <main className="max-w-md mx-auto w-full">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan">
              Gerenciar Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-oraculo-purple" />
              <p className="text-gray-700">
                Ative as notificações para receber alertas sobre novos matches,
                mensagens e atualizações da sua assinatura.
              </p>
            </div>

            {token ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <p>Notificações ativadas. Token: {token.slice(0, 20)}...</p>
              </div>
            ) : (
              <Button
                onClick={handleEnableNotifications}
                className="w-full bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white"
                disabled={isSubscribing || !isNotificationSupported}
              >
                {isSubscribing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ativando...
                  </>
                ) : (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Ativar Notificações
                  </>
                )}
              </Button>
            )}

            {notification?.notification && (
              <div className="p-4 bg-gray-100 rounded-md">
                <p className="font-semibold">
                  {notification.notification.title || "Sem Título"}
                </p>
                <p className="text-gray-700">
                  {notification.notification.body || "Sem Conteúdo"}
                </p>
              </div>
            )}

            {profile?.subscription === 1 && (
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() =>
                  window.open(
                    "https://wa.me/+5511999999999?text=Teste%20de%20notificação",
                    "_blank"
                  )
                }
              >
                <FaWhatsapp className="mr-2 h-5 w-5" />
                Testar via WhatsApp
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
