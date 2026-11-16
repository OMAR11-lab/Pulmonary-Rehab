-- Allow the assigned pulmonologist to remove activities only while a plan is still a draft.
-- Existing admin delete access and all read/insert/update policies remain unchanged.
drop policy if exists program_items_clinician_delete_draft
on public.rehab_program_items;

create policy program_items_clinician_delete_draft
on public.rehab_program_items
for delete
to authenticated
using (
  public.is_active_pulmonologist()
  and exists (
    select 1
    from public.rehab_programs rp
    join public.patients p on p.id = rp.patient_id
    where rp.id = rehab_program_items.program_id
      and rp.status = 'draft'
      and p.assigned_clinician_id = auth.uid()
  )
);
