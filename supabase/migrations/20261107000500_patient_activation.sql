-- Patient invitation activation is a single-use, phone-verified transaction.
create or replace function public.complete_patient_invitation(p_token_hash text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_phone text;
  v_hash text;
  v_invitation public.patient_invitations%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required.' using errcode='28000'; end if;
  if p_token_hash is null or length(p_token_hash) <> 64 or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid invitation token.' using errcode='22023'; end if;
  select phone into v_phone from auth.users where id=v_user_id and phone_confirmed_at is not null;
  if v_phone is null then raise exception 'A verified phone number is required.' using errcode='22023'; end if;
  if not exists(select 1 from public.profiles where id=v_user_id and role='patient' and is_active=true) then raise exception 'This account is not eligible for patient activation.' using errcode='42501'; end if;
  v_hash := p_token_hash;
  select * into v_invitation from public.patient_invitations where token_hash=v_hash for update;
  if not found then raise exception 'Invitation is invalid or has already been used.' using errcode='22023'; end if;
  if v_invitation.used_at is not null or v_invitation.expires_at <= now() then raise exception 'Invitation has expired or has already been used.' using errcode='22023'; end if;
  if v_invitation.phone <> v_phone then raise exception 'The verified phone number does not match the invited patient record.' using errcode='42501'; end if;
  if exists(select 1 from public.patients where patient_user_id=v_user_id) then raise exception 'This account is already linked to a patient record.' using errcode='23505'; end if;
  update public.patients set patient_user_id=v_user_id where id=v_invitation.patient_id and patient_user_id is null;
  if not found then raise exception 'Patient record is already linked or unavailable.' using errcode='23505'; end if;
  update public.profiles set full_name=(select full_name from public.patients where id=v_invitation.patient_id), phone=v_phone where id=v_user_id;
  update public.patient_invitations set used_at=now() where id=v_invitation.id and used_at is null;
  if not found then raise exception 'Invitation has already been used.' using errcode='23505'; end if;
  return v_invitation.patient_id;
end; $$;
revoke all on function public.complete_patient_invitation(text) from public, anon;
grant execute on function public.complete_patient_invitation(text) to authenticated;
