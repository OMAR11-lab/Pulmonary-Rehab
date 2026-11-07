-- Phase 7: in-app notifications and clinician follow-up tasks.
create table if not exists public.app_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 patient_id uuid references public.patients(id) on delete cascade,
 notification_type text not null,
 title text not null,
 message text not null,
 metadata jsonb not null default '{}'::jsonb,
 read_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists app_notifications_user_idx on public.app_notifications(user_id,created_at desc);
create table if not exists public.follow_up_tasks (
 id uuid primary key default gen_random_uuid(),
 patient_id uuid not null references public.patients(id) on delete cascade,
 clinician_id uuid not null references public.profiles(id),
 title text not null,
 details text,
 due_date date not null,
 status text not null default 'open' check(status in ('open','completed','cancelled')),
 created_by uuid not null references public.profiles(id),
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists follow_up_tasks_clinician_due_idx on public.follow_up_tasks(clinician_id,due_date,status);
alter table public.app_notifications enable row level security;
alter table public.follow_up_tasks enable row level security;
create policy "notifications_read_self" on public.app_notifications for select to authenticated using(user_id=auth.uid());
create policy "notifications_update_self" on public.app_notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,update on public.app_notifications to authenticated;
create policy "followups_read_scoped" on public.follow_up_tasks for select to authenticated using(
 public.is_active_admin() or (public.is_active_pulmonologist() and clinician_id=auth.uid())
);
create policy "followups_clinician_insert" on public.follow_up_tasks for insert to authenticated with check(
 public.is_active_pulmonologist() and clinician_id=auth.uid() and created_by=auth.uid() and exists(select 1 from public.patients p where p.id=patient_id and p.assigned_clinician_id=auth.uid())
);
create policy "followups_clinician_update" on public.follow_up_tasks for update to authenticated using(
 public.is_active_admin() or (public.is_active_pulmonologist() and clinician_id=auth.uid())
) with check(public.is_active_admin() or (public.is_active_pulmonologist() and clinician_id=auth.uid() and exists(select 1 from public.patients p where p.id=patient_id and p.assigned_clinician_id=auth.uid())));
create policy "followups_admin_delete" on public.follow_up_tasks for delete to authenticated using(public.is_active_admin());
grant select,insert,update,delete on public.follow_up_tasks to authenticated;
drop trigger if exists follow_up_tasks_updated_at on public.follow_up_tasks;
create trigger follow_up_tasks_updated_at before update on public.follow_up_tasks for each row execute procedure public.set_updated_at();

create or replace function public.notify_clinician_on_patient_session()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_clinician uuid; v_patient_name text;
begin
 select assigned_clinician_id,full_name into v_clinician,v_patient_name from public.patients where id=new.patient_id;
 if v_clinician is not null then
  insert into public.app_notifications(user_id,patient_id,notification_type,title,message,metadata)
  values(v_clinician,new.patient_id,'patient_session_update','Patient activity update',v_patient_name || ' submitted a self-reported rehabilitation session update.',jsonb_build_object('program_id',new.program_id,'session_log_id',new.id));
 end if;
 return new;
end; $$;
drop trigger if exists notify_clinician_on_session on public.rehab_session_logs;
create trigger notify_clinician_on_session after insert on public.rehab_session_logs for each row execute procedure public.notify_clinician_on_patient_session();

create or replace function public.notify_patient_on_program_activation()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_patient_user uuid;
begin
 if new.status='active' and new.approved_at is not null and (old.status is distinct from new.status or old.approved_at is distinct from new.approved_at) then
  select patient_user_id into v_patient_user from public.patients where id=new.patient_id;
  if v_patient_user is not null then
   insert into public.app_notifications(user_id,patient_id,notification_type,title,message,metadata)
   values(v_patient_user,new.patient_id,'program_approved','Your rehabilitation plan is ready','Your clinician has approved a rehabilitation plan. Sign in to review the activities.',jsonb_build_object('program_id',new.id));
  end if;
 end if;
 return new;
end; $$;
drop trigger if exists notify_patient_on_program_activation on public.rehab_programs;
create trigger notify_patient_on_program_activation after update on public.rehab_programs for each row execute procedure public.notify_patient_on_program_activation();
