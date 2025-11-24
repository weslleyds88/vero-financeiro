// Supabase Edge Function para resetar senha de atleta
// Deploy: supabase functions deploy admin-reset-password

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticação necessário' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente Supabase com token do usuário
    // Supabase Edge Functions têm acesso automático a essas variáveis
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('Variáveis de ambiente:', {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        hasServiceKey: !!supabaseServiceKey
      })
      return new Response(
        JSON.stringify({ 
          error: 'Variáveis de ambiente não configuradas',
          detail: 'As variáveis SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY devem estar disponíveis'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    // Verificar se o usuário é admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado', detail: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar perfil do usuário para verificar se é admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem resetar senhas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obter dados da requisição
    const { userId: targetUserId } = await req.json()

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar email do usuário
    const { data: targetProfile, error: targetProfileError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', targetUserId)
      .single()

    if (targetProfileError || !targetProfile || !targetProfile.email) {
      return new Response(
        JSON.stringify({ 
          error: 'Usuário não encontrado ou sem email',
          detail: targetProfileError?.message
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente admin para resetar senha
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Gerar senha aleatória
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const newPassword = Array.from({ length: 12 }, () => 
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')

    // Buscar usuário no auth pelo email (usando API direta)
    // Primeiro, tentar buscar pelo ID diretamente
    let targetAuthUser = null
    
    try {
      // Tentar buscar pelo ID primeiro (mais rápido e direto)
      const { data: userById, error: userByIdError } = await supabaseAdmin.auth.admin.getUserById(targetUserId)
      
      if (!userByIdError && userById?.user) {
        targetAuthUser = userById.user
        console.log('Usuário encontrado por ID:', targetAuthUser.id)
      } else {
        // Se não encontrou por ID, buscar por email
        console.log('Buscando por email:', targetProfile.email)
        console.log('Target User ID do profiles:', targetUserId)
        
        // Listar todos os usuários (pode ter paginação, então buscamos todos)
        let allUsers = []
        let page = 1
        const perPage = 1000 // Máximo permitido
        
        while (true) {
          const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage
          })
          
          if (authError) {
            console.error('Erro ao listar usuários:', authError)
            return new Response(
              JSON.stringify({ error: 'Erro ao buscar usuários', detail: authError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          if (!authUsers || !authUsers.users || authUsers.users.length === 0) {
            break
          }

          allUsers = allUsers.concat(authUsers.users)
          
          // Se retornou menos que perPage, chegamos ao fim
          if (authUsers.users.length < perPage) {
            break
          }
          
          page++
        }

        console.log(`Total de usuários encontrados: ${allUsers.length}`)
        console.log('Primeiros 5 emails:', allUsers.slice(0, 5).map(u => u.email))

        // Buscar com comparação case-insensitive e trim
        const targetEmailNormalized = targetProfile.email?.toLowerCase().trim()
        targetAuthUser = allUsers.find(u => {
          const userEmailNormalized = u.email?.toLowerCase().trim()
          return userEmailNormalized === targetEmailNormalized
        })
        
        if (targetAuthUser) {
          console.log('✅ Usuário encontrado por email:', targetAuthUser.id, targetAuthUser.email)
        } else {
          console.log('❌ Email não encontrado. Email buscado:', targetEmailNormalized)
          console.log('Emails disponíveis (primeiros 10):', allUsers.slice(0, 10).map(u => u.email))
        }
      }
    } catch (searchError) {
      console.error('Erro na busca:', searchError)
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar usuário',
          detail: searchError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!targetAuthUser) {
      return new Response(
        JSON.stringify({ 
          error: 'Usuário não encontrado em Authentication',
          detail: `Não foi possível encontrar o usuário com email ${targetProfile.email} ou ID ${targetUserId}. Verifique se o usuário existe na tabela auth.users.`,
          debug: {
            targetUserId,
            targetEmail: targetProfile.email,
            searchedById: true,
            searchedByEmail: true
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Atualizar senha
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetAuthUser.id,
      { password: newPassword, email_confirm: true }
    )

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar senha', detail: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Marcar que o usuário deve trocar a senha no próximo login
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', targetUserId)

    if (profileUpdateError) {
      console.error('Erro ao marcar must_change_password:', profileUpdateError)
      // Não falhar a operação, apenas logar o erro
      // A senha já foi resetada, então continuamos
    } else {
      console.log('✅ Perfil marcado para troca obrigatória de senha')
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        password: newPassword,
        message: 'Senha resetada com sucesso'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro na função:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        detail: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

