-- Phase 5–6: individualized clinician-prescribed programs and patient self-reported tracking.
create table if not exists public.rehab_programs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  clinician_id uuid not null references public.profiles(id),
  title text not null default 'Bronchial asthma rehabilitation plan',
  start_date date not null,
  end_date date,
  planned_weeks smallint not null default 8 check (planned_weeks between 1 and 52),
  sessions_per_week smallint not null default 3 check (sessions_per_week between 1 and 7),
  session_duration_min smallint,
  session_duration_max smallint,
  status text not null default 'draft' check (status in ('draft','active','on_hold','completed')),
  approved_at timestamptz,
  clinician_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (session_duration_min is null or session_duration_min > 0),
  check (session_duration_max is null or session_duration_max >= session_duration_min)
);
create index if not exists rehab_programs_patient_idx on public.rehab_programs(patient_id,start_date desc);

create table if not exists public.rehab_program_items (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.rehab_programs(id) on delete cascade,
  library_item_id uuid references public.rehab_library_items(id) on delete set null,
  exercise_title text not null,
  category text not null,
  instructions text,
  frequency text,
  sets smallint,
  repetitions smallint,
  duration_minutes numeric(6,2),
  intensity text,
  rest_seconds smallint,
  clinician_notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists rehab_program_items_program_idx on public.rehab_program_items(program_id,sort_order);

create table if not exists public.rehab_session_logs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.rehab_programs(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  session_date date not null default current_date,
  completion_status text not null check (completion_status in ('completed','partially_completed','not_completed')),
  completed_minutes numeric(6,2),
  perceived_difficulty text check (perceived_difficulty is null or perceived_difficulty in ('easy','manageable','difficult','very_difficult')),
  symptoms text,
  missed_reason text,
  patient_notes text,
  created_at timestamptz not null default now()
);
create index if not exists rehab_session_logs_program_date_idx on public.rehab_session_logs(program_id,session_date desc);

alter table public.rehab_programs enable row level security;
alter table public.rehab_program_items enable row level security;
alter table public.rehab_session_logs enable row level security;

create or replace function public.can_access_rehab_program(p_program_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
 select exists (select 1 from public.rehab_programs rp join public.patients p on p.id=rp.patient_id
   where rp.id=p_program_id and (public.is_active_admin() or (public.is_active_pulmonologist() and p.assigned_clinician_id=auth.uid()) or (p.patient_user_id=auth.uid() and rp.status='active' and rp.approved_at is not null)));
$$;
revoke all on function public.can_access_rehab_program(uuid) from public, anon;
grant execute on function public.can_access_rehab_program(uuid) to authenticated;

create policy "programs_read_scoped" on public.rehab_programs for select to authenticated using (
 public.can_access_rehab_program(id)
);
create policy "programs_clinician_insert" on public.rehab_programs for insert to authenticated with check (
 public.is_active_admin() or (public.is_active_pulmonologist() and clinician_id=auth.uid() and exists(select 1 from public.patients p where p.id=patient_id and p.assigned_clinician_id=auth.uid()))
);
create policy "programs_clinician_update" on public.rehab_programs for update to authenticated using (
 public.is_active_admin() or (public.is_active_pulmonologist() and exists(select 1 from public.patients p where p.id=patient_id and p.assigned_clinician_id=auth.uid()))
) with check (public.is_active_admin() or (public.is_active_pulmonologist() and clinician_id=auth.uid() and exists(select 1 from public.patients p where p.id=patient_id and p.assigned_clinician_id=auth.uid())));
create policy "programs_admin_delete" on public.rehab_programs for delete to authenticated using(public.is_active_admin());

create policy "program_items_read_scoped" on public.rehab_program_items for select to authenticated using(
 public.can_access_rehab_program(program_id) and (
   not exists(select 1 from public.rehab_programs rp join public.patients p on p.id=rp.patient_id where rp.id=program_id and p.patient_user_id=auth.uid())
   or library_item_id is null
   or exists(select 1 from public.rehab_library_items li where li.id=library_item_id and li.active=true and li.approved=true)
 )
);
create policy "program_items_clinician_insert" on public.rehab_program_items for insert to authenticated with check (
 public.is_active_admin() or (public.is_active_pulmonologist() and exists(select 1 from public.rehab_programs rp join public.patients p on p.id=rp.patient_id where rp.id=program_id and p.assigned_clinician_id=auth.uid()))
);
create policy "program_items_clinician_update" on public.rehab_program_items for update to authenticated using (
 public.is_active_admin() or (public.is_active_pulmonologist() and exists(select 1 from public.rehab_programs rp join public.patients p on p.id=rp.patient_id where rp.id=program_id and p.assigned_clinician_id=auth.uid()))
) with check (
 public.is_active_admin() or (public.is_active_pulmonologist() and exists(select 1 from public.rehab_programs rp join public.patients p on p.id=rp.patient_id where rp.id=program_id and p.assigned_clinician_id=auth.uid()))
);
create policy "program_items_admin_delete" on public.rehab_program_items for delete to authenticated using(public.is_active_admin());

create policy "session_logs_read_scoped" on public.rehab_session_logs for select to authenticated using(
 public.is_active_admin() or (public.is_active_pulmonologist() and exists(select 1 from public.patients p where p.id=patient_id and p.assigned_clinician_id=auth.uid()))
 or exists(select 1 from public.patients p where p.id=patient_id and p.patient_user_id=auth.uid())
);
create policy "session_logs_patient_insert" on public.rehab_session_logs for insert to authenticated with check(
 exists(select 1 from public.patients p where p.id=patient_id and p.patient_user_id=auth.uid()) and exists(select 1 from public.rehab_programs rp where rp.id=program_id and rp.patient_id=patient_id and rp.status='active' and rp.approved_at is not null)
);
create policy "session_logs_clinician_insert" on public.rehab_session_logs for insert to authenticated with check(
 public.is_active_pulmonologist() and exists(select 1 from public.patients p join public.rehab_programs rp on rp.patient_id=p.id where p.id=patient_id and rp.id=program_id and p.assigned_clinician_id=auth.uid())
);

 grant select,insert,update,delete on public.rehab_programs to authenticated;
 grant select,insert,update,delete on public.rehab_program_items to authenticated;
 grant select,insert on public.rehab_session_logs to authenticated;
drop trigger if exists rehab_programs_updated_at on public.rehab_programs;
create trigger rehab_programs_updated_at before update on public.rehab_programs for each row execute procedure public.set_updated_at();

create or replace function public.audit_rehab_program_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),case when tg_op='INSERT' then 'program.created' else 'program.updated' end,'rehab_program',new.id::text,jsonb_build_object('patient_id',new.patient_id,'status',new.status));
 return new;
end; $$;
drop trigger if exists rehab_programs_audit on public.rehab_programs;
create trigger rehab_programs_audit after insert or update on public.rehab_programs for each row execute procedure public.audit_rehab_program_change();
