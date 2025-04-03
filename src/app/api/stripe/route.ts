import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getSession } from '@/lib/supabase'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
  typescript: true
})

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object)
        break
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erro no webhook:', err)
    return NextResponse.json(
      { error: 'Falha no processamento do webhook' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { data: { user }, error } = await getSession()
  if (!user || error) throw new Error('Usuário não autenticado')

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  )

  const { error: dbError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: user.id,
      stripe_subscription_id: subscription.id,
      plan_id: session.metadata?.plan_id,
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000)
    })

  if (dbError) throw dbError
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000)
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) throw error
}