import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
type Role = 'admin' | 'pulmonologist'
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization' }, 401)

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: authData, error: authError } = await callerClient.auth.getUser()
    if (authError || !authData.user) return json({ error: 'Invalid session' }, 401)

    const adminClient = createClient(supabaseUrl, serviceKey)
    const { data: callerProfile, error: profileError } = await adminClient.from('profiles').select('role,is_active').eq('id', authData.user.id).maybeSingle()
    if (profileError || callerProfile?.role !== 'admin' || callerProfile?.is_active !== true) return json({ error: 'Only an active administrator can create accounts.' }, 403)

    let body: { full_name?: string; email?: string; phone?: string; password?: string; role?: Role }
    try { body = await req.json() } catch { return json({ error: 'Invalid request body' }, 400) }
    const fullName = body.full_name?.trim()
    const email = body.email?.trim().toLowerCase()
    const phone = body.phone?.trim() || null
    const password = body.password
    const role = body.role
    if (!fullName || fullName.length > 160 || !email || !/^\S+@\S+\.\S+$/.test(email) || !password || password.length < 10 || !role || !['admin','pulmonologist'].includes(role)) {
      return json({ error: 'Provide a valid name, email, role and password of at least 10 characters.' }, 400)
    }

    // Create a confirmed account directly. No confirmation or invitation email is sent.
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: fullName, phone },
    })
    if (createError || !created.user) return json({ error: createError?.message ?? 'Unable to create account.' }, 400)

    const { error: updateError } = await adminClient.from('profiles').upsert({
      id: created.user.id, full_name: fullName, email, phone, role, is_active: true,
    }, { onConflict: 'id' })
    if (updateError) {
      await adminClient.auth.admin.deleteUser(created.user.id)
      return json({ error: 'Account profile could not be created. No account was retained.' }, 500)
    }
    await adminClient.from('audit_logs').insert({
      actor_id: authData.user.id, action: 'account.created', entity_type: 'profile', entity_id: created.user.id,
      details: { role, email },
    })
    return json({ user_id: created.user.id, role, message: 'Account created and email confirmed. No email was sent.' }, 201)
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Unexpected error.' }, 500) }
})
