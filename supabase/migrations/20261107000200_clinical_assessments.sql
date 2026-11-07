-- Phase 3: longitudinal clinical assessments for adult bronchial asthma patients.
-- Scores are recorded, not interpreted as automated clinical decisions.

create table if not exists public.clinical_assessments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  assessment_type text not null check (assessment_type in ('baseline','interim','post_program','follow_up')),
  assessment_date date not null default current_date,
  assessor_id uuid not null references public.profiles(id),
  clinical_history jsonb not null default '{}'::jsonb,
  clinical_examination jsonb not null default '{}'::jsonb,
  eligibility_review jsonb not null default '{}'::jsonb,
  mmrc_score smallint check (mmrc_score is null or mmrc_score between 0 and 4),
  act_score smallint check (act_score is null or act_score between 5 and 25),
  six_mwt jsonb not null default '{}'::jsonb,
  spirometry jsonb not null default '{}'::jsonb,
  anthropometry jsonb not null default '{}'::jsonb,
  hads_anxiety smallint check (hads_anxiety is null or hads_anxiety between 0 and 21),
  hads_depression smallint check (hads_depression is null or hads_depression between 0 and 21),
  education_delivered jsonb not null default '{}'::jsonb,
  clinical_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clinical_assessments_patient_date_idx
  on public.clinical_assessments(patient_id, assessment_date desc);
create index if not exists clinical_assessments_assessor_idx
  on public.clinical_assessments(assessor_id);

alter table public.clinical_assessments enable row level security;
drop policy if exists "assessments_read_scoped" on public.clinical_assessments;
create policy "assessments_read_scoped" on public.clinical_assessments
for select to authenticated using (
  public.is_active_admin()
  or exists (select 1 from public.patients p where p.id = patient_id and p.assigned_clinician_id = auth.uid() and public.is_active_pulmonologist())
  or exists (select 1 from public.patients p where p.id = patient_id and p.patient_user_id = auth.uid())
);
drop policy if exists "assessments_insert_assigned" on public.clinical_assessments;
create policy "assessments_insert_assigned" on public.clinical_assessments
for insert to authenticated with check (
  public.is_active_admin()
  or (public.is_active_pulmonologist() and assessor_id = auth.uid() and exists (
    select 1 from public.patients p where p.id = patient_id and p.assigned_clinician_id = auth.uid() and p.diagnosis = 'bronchial_asthma'
  ))
);
drop policy if exists "assessments_update_assigned" on public.clinical_assessments;
create policy "assessments_update_assigned" on public.clinical_assessments
for update to authenticated using (
  public.is_active_admin()
  or (public.is_active_pulmonologist() and exists (select 1 from public.patients p where p.id = patient_id and p.assigned_clinician_id = auth.uid()))
) with check (
  public.is_active_admin()
  or (public.is_active_pulmonologist() and assessor_id = auth.uid() and exists (select 1 from public.patients p where p.id = patient_id and p.assigned_clinician_id = auth.uid()))
);
drop policy if exists "assessments_admin_delete" on public.clinical_assessments;
create policy "assessments_admin_delete" on public.clinical_assessments
for delete to authenticated using (public.is_active_admin());

grant select, insert, update on public.clinical_assessments to authenticated;
revoke delete on public.clinical_assessments from authenticated;
drop trigger if exists clinical_assessments_updated_at on public.clinical_assessments;
create trigger clinical_assessments_updated_at before update on public.clinical_assessments
for each row execute procedure public.set_updated_at();

create or replace function public.audit_assessment_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), case when tg_op = 'INSERT' then 'assessment.created' else 'assessment.updated' end,
    'clinical_assessment', (case when tg_op = 'INSERT' then new.id else new.id end)::text,
    jsonb_build_object('assessment_type', new.assessment_type, 'patient_id', new.patient_id));
  return new;
end; $$;
drop trigger if exists clinical_assessments_audit on public.clinical_assessments;
create trigger clinical_assessments_audit after insert or update on public.clinical_assessments
for each row execute procedure public.audit_assessment_change();
