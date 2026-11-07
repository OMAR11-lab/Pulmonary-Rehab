import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const hex = (bytes: Uint8Array) => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, appUrl = Deno.env.get('APP_URL')
    if (!appUrl) return json({ error: 'APP_URL secret is not configured.' }, 500)
    const authHeader = req.headers.get('Authorization') ?? ''
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: authError } = await caller.auth.getUser()
    if (authError || !user) return json({ error: 'Authentication required.' }, 401)
    const admin = createClient(url, service)
    const { data: profile } = await admin.from('profiles').select('role,is_active').eq('id', user.id).maybeSingle()
    if (!profile?.is_active || !['admin', 'pulmonologist'].includes(profile.role)) return json({ error: 'Only active administrators or pulmonologists can invite a patient.' }, 403)
    const { patient_id } = await req.json()
    if (typeof patient_id !== 'string') return json({ error: 'A patient record is required.' }, 400)
    const { data: patient, error: patientError } = await admin.from('patients').select('id,phone,assigned_clinician_id,patient_user_id').eq('id', patient_id).maybeSingle()
    if (patientError || !patient) return json({ error: 'Patient record not found.' }, 404)
    if (profile.role === 'pulmonologist' && patient.assigned_clinician_id !== user.id) return json({ error: 'You can only invite patients assigned to your account.' }, 403)
    if (patient.patient_user_id) return json({ error: 'This patient record is already linked to an account.' }, 409)
    if (!patient.phone || !/^\+[1-9]\d{7,14}$/.test(patient.phone)) return json({ error: 'Add a valid international phone number in E.164 format (for example, +20…).'}, 400)
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
    const token = hex(tokenBytes)
    const hash = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))))
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { error: insertError } = await admin.from('patient_invitations').insert({ patient_id, phone: patient.phone, token_hash: hash, expires_at: expiresAt, created_by: user.id })
    if (insertError) return json({ error: insertError.message }, 500)
    const activationUrl = `${appUrl.replace(/\/$/, '')}/patient-activate?token=${encodeURIComponent(token)}`
    return json({ activation_url: activationUrl, expires_at: expiresAt, phone: patient.phone })
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Unexpected error.' }, 500) }
})
