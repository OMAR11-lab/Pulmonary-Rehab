import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const hex = (bytes: Uint8Array) => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
const normalizePhone = (value: string) => value.replace(/[^0-9]/g, '')
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const url = Deno.env.get('SUPABASE_URL')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { token, phone, password } = await req.json()
    if (typeof token !== 'string' || token.length < 32 || typeof phone !== 'string' || typeof password !== 'string' || password.length < 10) return json({ error: 'Enter the registered phone number and a password of at least 10 characters.' }, 400)
    const tokenHash = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))))
    const admin = createClient(url, service)
    const { data: invitation, error: invitationError } = await admin.from('patient_invitations').select('id,patient_id,phone,expires_at,used_at').eq('token_hash', tokenHash).maybeSingle()
    if (invitationError || !invitation) return json({ error: 'This activation link is invalid. Ask your clinic for a new link.' }, 400)
    if (invitation.used_at || new Date(invitation.expires_at).getTime() <= Date.now()) return json({ error: 'This activation link has expired or was already used. Ask your clinic for a new link.' }, 400)
    const { data: patient, error: patientError } = await admin.from('patients').select('id,full_name,phone,patient_user_id').eq('id', invitation.patient_id).maybeSingle()
    if (patientError || !patient || patient.patient_user_id) return json({ error: 'The patient record is unavailable or already linked.' }, 409)
    if (!patient.phone || normalizePhone(phone) !== normalizePhone(patient.phone) || normalizePhone(phone) !== normalizePhone(invitation.phone)) return json({ error: 'The phone number does not match the number entered by your doctor. Check the number or contact your clinic.' }, 403)

    // Phone is matched against the clinic record only. No SMS or OTP is sent.
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      phone: patient.phone, password, phone_confirm: true,
      user_metadata: { full_name: patient.full_name },
    })
    if (createError || !created.user) return json({ error: createError?.message ?? 'Unable to create the patient account.' }, 400)

    const { error: completeError } = await admin.rpc('complete_patient_activation', {
      p_token_hash: tokenHash, p_phone: patient.phone, p_user_id: created.user.id,
    })
    if (completeError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: completeError.message }, 400)
    }
    return json({ user_id: created.user.id, phone: patient.phone, message: 'Patient account activated.' }, 201)
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Unexpected error.' }, 500) }
})
