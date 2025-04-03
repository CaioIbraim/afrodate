import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  try {
    const { to, subject, template, variables } = await req.json()
    
    const { data: user } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('email', to)
      .single()

    const templates = {
      welcome: {
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h1 style="color: #7C3AED;">Bem-vindo ao Oráculo, ${user?.full_name || ''}!</h1>
            <p>Sua conta foi criada com sucesso. Comece a explorar conexões agora mesmo:</p>
            <a href="${Deno.env.get('SITE_URL')}" style="
              display: inline-block;
              padding: 12px 24px;
              background: #7C3AED;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              margin-top: 20px;
            ">
              Acessar Plataforma
            </a>
          </div>
        `
      },
      'password-reset': {
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h2 style="color: #7C3AED;">Redefinição de Senha</h2>
            <p>Clique no link abaixo para redefinir sua senha:</p>
            <a href="${variables.reset_link}" style="
              display: inline-block;
              padding: 12px 24px;
              background: #7C3AED;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              margin: 20px 0;
            ">
              Redefinir Senha
            </a>
            <p style="color: #666;">Este link expira em 1 hora.</p>
          </div>
        `
      }
    }

    const templateConfig = templates[template as keyof typeof templates]
    if (!templateConfig) throw new Error('Template não encontrado')

    const { error } = await supabase.functions.invoke('email-service', {
      body: {
        to,
        subject,
        html: templateConfig.html
      }
    })

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})