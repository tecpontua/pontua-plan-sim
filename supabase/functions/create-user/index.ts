import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, role, teamId } = await req.json();

    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ error: 'Email, password e role são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente admin usando service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Criar usuário usando Admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirma o email
      user_metadata: {}
    });

    if (createError) {
      console.error('Erro ao criar usuário:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userData.user) {
      return new Response(
        JSON.stringify({ error: 'Falha ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aguardar a criação do profile pelo trigger
    let attempts = 0;
    const maxAttempts = 10;
    let profileExists = false;

    while (attempts < maxAttempts && !profileExists) {
      const { data: checkProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (checkProfile) {
        profileExists = true;
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
    }

    // Atualizar profile com team_id se fornecido
    if (teamId && profileExists) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ team_id: teamId })
        .eq('id', userData.user.id);

      if (profileError) {
        console.error('Erro ao atualizar profile:', profileError);
      }
    }

    // Inserir role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userData.user.id, role });

    if (roleError) {
      console.error('Erro ao inserir role:', roleError);
      // Tentar deletar o usuário se falhar ao criar role
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      return new Response(
        JSON.stringify({ error: 'Erro ao atribuir papel ao usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: userData.user.id, 
          email: userData.user.email 
        } 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
