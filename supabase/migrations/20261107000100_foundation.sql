-- Respira / Pulmonary Rehabilitation Platform
-- Phase 1: secure foundation. Clinical scope is intentionally bronchial asthma only.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('admin', 'pulmonologist', 'patient');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.patient_status as enum ('active', 'inactive', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.patient_diagnosis as enum ('bronchial_asthma');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  role public.app_role not null default 'patient',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (char_length(full_name) <= 160)
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  date_of_birth date,
  sex text check (sex is null or sex in ('female', 'male', 'other', 'not_recorded')),
  phone text,
  email text,
  residence text,
  occupation text,
  chief_complaint text,
  diagnosis public.patient_diagnosis not null default 'bronchial_asthma',
  status public.patient_status not null default 'active',
  assigned_clinician_id uuid not null references public.profiles(id),
  patient_user_id uuid unique references auth.users(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_invitations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  phone text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists patients_assigned_clinician_idx on public.patients(assigned_clinician_id);
create index if not exists patients_patient_user_idx on public.patients(patient_user_id);
create index if not exists patients_status_idx on public.patients(status);
create index if not exists invitations_patient_idx on public.patient_invitations(patient_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create or replace function public.current_user_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active = true limit 1;
$$;

create or replace function public.is_active_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active = true);
$$;

create or replace function public.is_active_pulmonologist()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'pulmonologist' and is_active = true);
$$;

-- New auth users receive the least-privileged role. Role elevation is server/admin-only.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.phone,
    'patient'
  ) on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users for each row execute procedure public.handle_new_auth_user();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists patients_updated_at on public.patients;
create trigger patients_updated_at before update on public.patients for each row execute procedure public.set_updated_at();

create or replace function public.write_audit_log(
  p_action text, p_entity_type text, p_entity_id text, p_details jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb));
end; $$;

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.patient_invitations enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: users can read their own profile; administrators can manage all profiles.
drop policy if exists "profiles_read_self_or_admin" on public.profiles;
create policy "profiles_read_self_or_admin" on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_active_admin());

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert" on public.profiles
for insert to authenticated with check (public.is_active_admin());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
for update to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete" on public.profiles
for delete to authenticated using (public.is_active_admin());

-- Patients: every record is bronchial asthma; pulmonologists see only assigned records.
drop policy if exists "patients_read_scoped" on public.patients;
create policy "patients_read_scoped" on public.patients
for select to authenticated
using (
  public.is_active_admin()
  or assigned_clinician_id = auth.uid() and public.is_active_pulmonologist()
  or patient_user_id = auth.uid()
);

drop policy if exists "patients_clinician_insert_own" on public.patients;
create policy "patients_clinician_insert_own" on public.patients
for insert to authenticated
with check (
  public.is_active_admin()
  or (public.is_active_pulmonologist() and assigned_clinician_id = auth.uid() and created_by = auth.uid() and diagnosis = 'bronchial_asthma')
);

drop policy if exists "patients_update_scoped" on public.patients;
create policy "patients_update_scoped" on public.patients
for update to authenticated
using (public.is_active_admin() or (public.is_active_pulmonologist() and assigned_clinician_id = auth.uid()))
with check (public.is_active_admin() or (public.is_active_pulmonologist() and assigned_clinician_id = auth.uid() and diagnosis = 'bronchial_asthma'));

drop policy if exists "patients_admin_delete" on public.patients;
create policy "patients_admin_delete" on public.patients
for delete to authenticated using (public.is_active_admin());

-- Invitation secrets are never exposed through direct client queries; Edge Functions use the service role.
-- No authenticated SELECT/INSERT/UPDATE policy is intentionally defined for patient_invitations.

drop policy if exists "audit_logs_admin_read" on public.audit_logs;
create policy "audit_logs_admin_read" on public.audit_logs
for select to authenticated using (public.is_active_admin());

revoke all on public.patient_invitations from anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
revoke all on public.patients from authenticated;
grant select, delete on public.patients to authenticated;
grant insert (full_name, date_of_birth, sex, phone, email, residence, occupation, chief_complaint, diagnosis, status, assigned_clinician_id, created_by) on public.patients to authenticated;
grant update (full_name, date_of_birth, sex, phone, email, residence, occupation, chief_complaint, diagnosis, status, assigned_clinician_id) on public.patients to authenticated;
grant select on public.audit_logs to authenticated;
grant usage, select on sequence public.audit_logs_id_seq to authenticated;

-- IMPORTANT: bootstrap the first administrator manually after creating their Auth user:
-- update public.profiles set role = 'admin' where email = 'YOUR_ADMIN_EMAIL';
-- Run this once from the Supabase SQL editor as the project owner.

-- Record patient record lifecycle events without copying clinical narrative into the audit trail.
create or replace function public.audit_patient_row_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_action text;
  v_id text;
begin
  if tg_op = 'INSERT' then v_action := 'patient.created'; v_id := new.id::text;
  elsif tg_op = 'UPDATE' then v_action := 'patient.updated'; v_id := new.id::text;
  else v_action := 'patient.deleted'; v_id := old.id::text;
  end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), v_action, 'patient', v_id, jsonb_build_object('diagnosis', 'bronchial_asthma'));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

drop trigger if exists patients_audit_log on public.patients;
create trigger patients_audit_log
after insert or update or delete on public.patients
for each row execute procedure public.audit_patient_row_change();

revoke all on function public.write_audit_log(text, text, text, jsonb) from public, anon, authenticated;

-- The thesis cohort is adults aged 18 years or older. Enforce this inclusion boundary at the database layer.
alter table public.patients alter column date_of_birth set not null;
create or replace function public.enforce_adult_asthma_patient()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'This application release is restricted to adults aged 18 years or older.' using errcode = '23514';
  end if;
  return new;
end; $$;

drop trigger if exists patients_adult_scope on public.patients;
create trigger patients_adult_scope
before insert or update of date_of_birth on public.patients
for each row execute procedure public.enforce_adult_asthma_patient();
