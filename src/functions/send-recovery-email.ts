import { supabase } from '@/lib/supabase'

export async function sendRecoveryEmail(email: string) {
  const { error } = await supabase.functions.invoke('send-email', {
    body: {
      to: email,
      subject: 'Recuperação de Senha',
      content: `Olá, recebemos uma solicitação para redefinir sua senha. Caso não tenha sido você, ignore este email.`,
    },
  })

  if (error) {
    console.error('Failed to send recovery email:', error.message)
  }
}
