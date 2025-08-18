// supabase/functions/send-native-push/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendNotification, type VapidDetails } from 'web-push'; // Importando da nova biblioteca

serve(async (req) => {
  const { userId, payload } = await req.json();

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Busca a inscrição do usuário
  const { data, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('subscription_details')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Inscrição não encontrada.' }), { status: 404 });
  }

  const subscription = data.subscription_details;
  const stringifiedPayload = JSON.stringify(payload);

  // Monta os detalhes VAPID para a chamada
  const vapidDetails: VapidDetails = {
    publicKey: Deno.env.get('VAPID_PUBLIC_KEY')!,
    privateKey: Deno.env.get('VAPID_PRIVATE_KEY')!,
    subject: 'mailto:seu-email@exemplo.com',
  };

  try {
    // A chamada agora inclui os detalhes VAPID
    await sendNotification(subscription, stringifiedPayload, { vapidDetails });
    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err) {
    console.error('Erro ao enviar notificação:', err);
    // Lógica para remover inscrição com erro 410
    if (err.message.includes("410")) {
      await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId);
    }
    return new Response(JSON.stringify({ error: 'Falha ao enviar notificação.' }), { status: 500 });
  }
});