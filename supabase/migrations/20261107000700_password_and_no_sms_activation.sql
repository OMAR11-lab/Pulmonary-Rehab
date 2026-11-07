-- Patient activation is performed by a server-side Edge Function after matching
-- the entered phone number to the clinician-recorded number. No SMS is involved.
-- This function is service-role only and links the newly-created Auth user atomically.
create or replace function public.complete_patient_activation(
  p_token_hash text,
  p_phone text,
  p_user_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_invitation public.patient_invitations%rowtype;
  v_patient public.patients%rowtype;
  v_auth_phone text;
begin
  if p_token_hash is null or length(p_token_hash) <> 64 or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid activation token.' using errcode = '22023';
  end if;
  select * into v_invitation
  from public.patient_invitations
  where token_hash = p_token_hash
  for update;
  if not found or v_invitation.used_at is not null or v_invitation.expires_at <= now() then
    raise exception 'Activation link is invalid, expired or already used.' using errcode = '22023';
  end if;
  select * into v_patient from public.patients where id = v_invitation.patient_id for update;
  if not found or v_patient.patient_user_id is not null then
    raise exception 'Patient record is unavailable or already linked.' using errcode = '23505';
  end if;
  if regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') <> regexp_replace(coalesce(v_patient.phone, ''), '[^0-9]', '', 'g')
     or regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') <> regexp_replace(coalesce(v_invitation.phone, ''), '[^0-9]', '', 'g') then
    raise exception 'Phone number does not match the clinician-entered record.' using errcode = '42501';
  end if;
  select phone into v_auth_phone from auth.users where id = p_user_id and phone_confirmed_at is not null;
  if v_auth_phone is null or regexp_replace(v_auth_phone, '[^0-9]', '', 'g') <> regexp_replace(p_phone, '[^0-9]', '', 'g') then
    raise exception 'New account phone does not match the patient record.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id and role = 'patient') then
    raise exception 'Patient profile was not created.' using errcode = '42501';
  end if;
  update public.patients set patient_user_id = p_user_id where id = v_patient.id and patient_user_id is null;
  if not found then raise exception 'Patient record has already been linked.' using errcode = '23505'; end if;
  update public.profiles set full_name = v_patient.full_name, phone = v_patient.phone where id = p_user_id;
  update public.patient_invitations set used_at = now() where id = v_invitation.id and used_at is null;
  if not found then raise exception 'Activation link has already been used.' using errcode = '23505'; end if;
  return v_patient.id;
end;
$$;
revoke all on function public.complete_patient_activation(text, text, uuid) from public, anon, authenticated;
grant execute on function public.complete_patient_activation(text, text, uuid) to service_role;
