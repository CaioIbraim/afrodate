
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "https://esm.sh/web-push@3.6.7";

interface Notification {
  id: string;
  user_id: string;
  message: string;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Notification;
  schema: "public";
  old_record: Notification | null;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

webPush.setVapidDetails(
  "mailto:caiofabiocosta@gmail.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    const { data: subscriptionData } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", payload.record.user_id)
      .single();

    if (!subscriptionData?.subscription) {
      return new Response(JSON.stringify({ error: "No push subscription found" }), {
        headers: { "Content-Type": "application/json" },
        status: 404,
      });
    }

    await webPush.sendNotification(
      subscriptionData.subscription,
      JSON.stringify({
        title: "oraculo",
        message: payload.record.message,
      })
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending push:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});