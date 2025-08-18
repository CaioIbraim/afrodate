import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script"; // Importação correta para scripts
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";
import PushNotificationsProvider from "@/components/notifications/PushNotificationsProvider";
// A importação do UserProvider foi removida, pois parece estar dentro do 'Providers'
import "./globals.css";

// Configuração da fonte Inter
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ORÁCULO - Buscador de Alma Gêmea",
  description: "Encontre sua alma gêmea com nosso aplicativo de relacionamento",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: "#8B5CF6",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        {/* O ThemeProvider deve envolver tudo para gerenciar o tema dark/light */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {/* O Providers parece ser seu wrapper principal para hooks como o do usuário */}
          <Providers>
            <PushNotificationsProvider>{children}</PushNotificationsProvider>
          </Providers>

          {/* O Toaster é usado para exibir notificações/alertas no app */}
          <Toaster />
        </ThemeProvider>

        {/* Scripts do OneSignal gerenciados pelo Next.js */}
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          strategy="afterInteractive"
        />

        <Script id="onesignal-init" strategy="afterInteractive">
          {`
            window.OneSignal = window.OneSignal || [];
            OneSignal.push(function () {
              OneSignal.init({
                appId: "${process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID}",
                notifyButton: {
                  enable: true,
                },
                allowLocalhostAsSecureOrigin: true,
              });
            });
          `}
        </Script>
      </body>
    </html>
  );
}