import { supabase } from '@/lib/supabase'

export async function sendWelcomeEmail(email: string, name: string) {
  const { error } = await supabase.functions.invoke('send-email', {
    body: {
      to: email,
      subject: 'Bem-vindo ao Oráculo!',
      content: `Olá ${name}, bem-vindo ao Oráculo! Estamos felizes em tê-lo conosco.`,
    },
  })

  if (error) {
    console.error('Failed to send welcome email:', error.message)
  }
}
