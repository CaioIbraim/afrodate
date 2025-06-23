"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { SubscribeButton } from "@/components/notifications/SubscribeButton";
import { UnsubscribeButton } from "@/components/notifications/UnsubscribeButton";
import NotificationForm from "@/components/notifications/SendNotification";
import { useCurrentUser } from "@/utils/useCurrentUser";
import { useToast } from "@/components/ui/use-toast";

export default function Home() {
  const { token, user } = useCurrentUser();
  const { toast } = useToast();

  const handleContentCopyClick = async () => {
    const firebaseToken = user?.data?.firebaseToken || token || "";
    if (!firebaseToken) {
      toast({
        title: "Erro",
        description: "Nenhum token disponível para copiar.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(firebaseToken);
      toast({
        title: "Sucesso",
        description: "Token copiado para a área de transferência!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao copiar o token.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-rows-[20px_auto_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-gray-50">
      <main className="w-full flex flex-col gap-5 row-start-2 items-center max-w-2xl">
        <Card className="w-full border-none shadow-sm">
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="relative">
              <Input
                id="firebase-token"
                value={token || user?.data?.firebaseToken || ""}
                placeholder="Seu Token Firebase"
                disabled
                className="pr-12 bg-gray-100 border-oraculo-purple/30 focus:border-oraculo-purple"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={handleContentCopyClick}
                title="Copiar Token"
              >
                <Copy className="h-4 w-4 text-oraculo-purple" />
              </Button>
            </div>
            <div className="flex gap-3 justify-center">
              <SubscribeButton />
              <UnsubscribeButton />
            </div>
          </CardContent>
        </Card>
        <Card className="w-full border-none shadow-sm">
          <CardContent className="flex flex-col gap-3 p-6">
            <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-oraculo-purple to-oraculo-cyan">
              Enviar Notificação
            </h2>
            <NotificationForm />
          </CardContent>
        </Card>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-oraculo-muted text-sm">
        &copy; 2025 Oráculo
      </footer>
    </div>
  );
}