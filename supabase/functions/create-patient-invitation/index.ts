import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const hex = (bytes: Uint8Array) => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const url = Deno.env.get('SUPABASE_URL')
    const anon = Deno.env.get('SUPABASE_ANON_KEY')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const appUrl = Deno.env.get('APP_URL')
    if (!url || !anon || !service) return json({ error: 'Supabase function secrets are incomplete. Configure SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY, then redeploy this function.' }, 500)
    if (!appUrl || !/^https:\/\/[^/]+$/i.test(appUrl.replace(/\/$/, ''))) return json({ error: 'APP_URL is missing or invalid. Set it to the deployed site origin, for example https://pulmonary-rehab.vercel.app, then redeploy this function.' }, 500)

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ error: 'Your staff session is missing. Sign out and sign in again.' }, 401)
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: authError } = await caller.auth.getUser()
    if (authError || !user) return json({ error: 'Your staff session is invalid or expired. Sign out and sign in again.' }, 401)

    const admin = createClient(url, service)
    const { data: profile, error: profileError } = await admin.from('profiles').select('role,is_active').eq('id', user.id).maybeSingle()
    if (profileError) return json({ error: `Could not verify staff permissions: ${profileError.message}` }, 500)
    if (!profile?.is_active || !['admin', 'pulmonologist'].includes(profile.role)) return json({ error: 'Only active administrators or pulmonologists can invite a patient. Check the staff profile role and active status.' }, 403)

    const body = await req.json().catch(() => null)
    const patientId = body?.patient_id
    if (typeof patientId !== 'string' || !patientId) return json({ error: 'A patient record is required. Close the patient record and open it again, then retry.' }, 400)

    const { data: patient, error: patientError } = await admin.from('patients').select('id,phone,assigned_clinician_id,patient_user_id').eq('id', patientId).maybeSingle()
    if (patientError) return json({ error: `Could not read the patient record: ${patientError.message}` }, 500)
    if (!patient) return json({ error: 'Patient record not found. Refresh the patient list and try again.' }, 404)
    if (profile.role === 'pulmonologist' && patient.assigned_clinician_id !== user.id) return json({ error: 'This patient is not assigned to your clinician account.' }, 403)
    if (patient.patient_user_id) return json({ error: 'This patient record is already linked to an account.' }, 409)
    if (!patient.phone || !/^\+[1-9]\d{7,14}$/.test(patient.phone)) return json({ error: 'The patient phone number must be saved in international format, for example +2010XXXXXXXX. Edit the patient record and include the country code.' }, 400)

    const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
    const token = hex(tokenBytes)
    const hash = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))))
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { error: insertError } = await admin.from('patient_invitations').insert({ patient_id: patientId, phone: patient.phone, token_hash: hash, expires_at: expiresAt, created_by: user.id })
    if (insertError) return json({ error: `Could not save the invitation: ${insertError.message}` }, 500)
    const activationUrl = `${appUrl.replace(/\/$/, '')}/patient-activate?token=${encodeURIComponent(token)}`
    return json({ activation_url: activationUrl, expires_at: expiresAt, phone: patient.phone })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error while creating the invitation.' }, 500)
  }
})
