import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Função para lidar com requisições CORS (essencial para invocar a função do navegador)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Responde a requisições OPTIONS do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      throw new Error("ID do usuário (userId) é obrigatório.");
    }

    // Crie um cliente de serviço para ter acesso total ao banco de dados
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Busque o Player ID do usuário no banco
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles') // Altere para sua tabela de perfis
      .select('onesignal_player_id')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    const playerId = profile?.onesignal_player_id;

    if (!playerId) {
      return new Response(JSON.stringify({ error: 'Usuário não está inscrito para notificações (Player ID não encontrado).' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Monte e envie a notificação via API do OneSignal
    const notification = {
      app_id: Deno.env.get('ONE_SIGNAL_APP_ID')!,
      include_player_ids: [playerId],
      headings: { en: 'Notificação de Teste 🧪' },
      contents: { en: `Olá! Este é um teste enviado em ${new Date().toLocaleTimeString('pt-BR')}.` },
      web_url: `${Deno.env.get('SUPABASE_URL')}/dashboard`, // URL para abrir ao clicar
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Deno.env.get('ONE_SIGNAL_API_KEY')}`,
      },
      body: JSON.stringify(notification),
    });

    const responseData = await response.json();

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});