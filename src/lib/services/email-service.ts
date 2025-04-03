import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const EmailService = {
  async sendWelcomeEmail(userEmail: string) {
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: userEmail,
        subject: 'Bem-vindo ao Oráculo',
        template: 'welcome',
        variables: {}
      }
    })

    if (error) throw error
  },

  async sendPasswordReset(email: string, token: string) {
    const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${token}`
    
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        subject: 'Redefinição de Senha',
        template: 'password-reset',
        variables: { reset_link: resetLink }
      }
    })

    if (error) throw error
  }
}