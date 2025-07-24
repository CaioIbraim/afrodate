import { NextRequest } from 'next/server';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const ASAAS_API_URL = process.env.ASAAS_API_URL;
const ASAAS_TOKEN = "$"+process.env.ASAAS_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  'access_token': ASAAS_TOKEN,
  'content-type': 'application/json',
  'Accept': 'application/json',
};

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return Response.json({ error: 'ID do pagamento é obrigatório.' }, { status: 400 });
  }

  try {
    // Check payment status with Asaas
    const response = await axios.get(`${ASAAS_API_URL}/payments/${id}`, { headers });
    const paymentStatus = response.data.status;

    if (paymentStatus === 'RECEIVED') {
      // Extract userId from request (e.g., query parameter or payment metadata)
      const userId = request.nextUrl.searchParams.get('userId');

      if (!userId) {
        console.error('User ID not provided in request');
        return Response.json(
          { error: 'ID de usuário não fornecido.' },
          { status: 400 }
        );
      }

      // Update subscriptions table
      const startsAt = new Date();
      const endsAt = new Date();
      endsAt.setMonth(endsAt.getMonth() + 1);

      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          is_active: true,
          is_cancelled: false,
          stripe_subscription_id: null,
        });

      if (subscriptionError) {
        console.error('Erro ao atualizar subscriptions:', subscriptionError.message, subscriptionError.details);
        return Response.json(
          { error: 'Erro ao registrar assinatura. Por favor, entre em contato com o suporte.' },
          { status: 500 }
        );
      }


      // Return success response
      return Response.json({ status: 'RECEIVED', updated: true });
    } else {
      // Return payment status if not RECEIVED
      return Response.json({ status: paymentStatus });
    }
  } catch (error: any) {
    console.error('Erro ao consultar status do pagamento:', error?.response?.data || error.message);
    return Response.json(
      { error: 'Erro ao verificar status do pagamento. Por favor, entre em contato com o suporte.' },
      { status: 500 }
    );
  }
}
