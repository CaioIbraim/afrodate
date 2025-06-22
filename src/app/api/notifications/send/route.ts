import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Firebase Admin SDK
if (!initializeApp.length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 });
    }

    // Fetch FCM token from Supabase
    const { data: tokenData, error: tokenError } = await supabase
      .from("tokens")
      .select("fcm_token")
      .eq("user_id", userId)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: "Token não encontrado" }, { status: 404 });
    }

    const message = {
      notification: {
        title: "Teste de Notificação",
        body: "Você recebeu uma notificação push do Afrodate!",
      },
      token: tokenData.fcm_token,
    };

    // Send notification
    const messaging = getMessaging();
    await messaging.send(message);

    return NextResponse.json({ message: "Notificação enviada com sucesso" });
  } catch (error: any) {
    console.error("Erro ao enviar notificação:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}