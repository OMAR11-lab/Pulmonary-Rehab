-- Phase 4: controlled exercise and education catalogue.
create table if not exists public.rehab_library_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null check (category in ('aerobic','resistance','breathing','flexibility','education','specialist_airway_clearance')),
  summary text not null default '',
  instructions text not null default '',
  media_url text check (media_url is null or media_url ~ '^https://'),
  media_label text,
  suggested_dose text,
  safety_note text,
  evidence_note text,
  clinician_supervision_required boolean not null default false,
  active boolean not null default true,
  approved boolean not null default false,
  version integer not null default 1 check (version > 0),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rehab_library_category_idx on public.rehab_library_items(category, active, approved);
alter table public.rehab_library_items enable row level security;
drop policy if exists "library_read_active" on public.rehab_library_items;
create policy "library_read_active" on public.rehab_library_items
for select to authenticated using (active = true and (approved = true or public.is_active_admin() or public.is_active_pulmonologist()));
drop policy if exists "library_admin_manage" on public.rehab_library_items;
create policy "library_admin_manage" on public.rehab_library_items
for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists "library_clinician_manage" on public.rehab_library_items;
create policy "library_clinician_manage" on public.rehab_library_items
for all to authenticated using (public.is_active_pulmonologist()) with check (public.is_active_pulmonologist());
grant select, insert, update, delete on public.rehab_library_items to authenticated;
drop trigger if exists rehab_library_updated_at on public.rehab_library_items;
create trigger rehab_library_updated_at before update on public.rehab_library_items
for each row execute procedure public.set_updated_at();

insert into public.rehab_library_items (slug,title,category,summary,instructions,suggested_dose,safety_note,evidence_note,clinician_supervision_required,approved)
values
('aerobic-treadmill-walking','Treadmill walking','aerobic','Aerobic conditioning described in the supplied thesis.','Use a clinician-selected treadmill speed and progression. The thesis describes a 5-minute warm-up, a conditioning phase and a 5-minute cool-down.','Thesis program describes 20–30 minutes per session including warm-up and cool-down. Intensity requires department-approved prescription.','Do not use a fixed heart-rate target from this catalogue. The thesis contains conflicting aerobic intensity ranges; the treating clinician must select and document the individualized target.','PULMONARY REHAB THESIS.pdf, Patients and Methods, pp. 76–77.',true,false),
('neck-resistance','Neck resistance exercises','resistance','Neck flexion, extension, lateral flexion and rotation.','Performed seated with the back kept straight; use controlled comfortable movement and clinician-selected resistance.','Thesis describes 3–5 sets of 8–12 repetitions with 60 seconds rest.','Stop and seek clinician review for pain, dizziness, unusual breathlessness or other concerning symptoms.','PULMONARY REHAB THESIS.pdf, Patients and Methods, p. 78.',true,false),
('upper-limb-resistance','Upper-limb resistance training','resistance','Shoulder press, biceps/triceps curls and triceps extension.','Select exercises and resistance according to the individualized clinician plan; maintain controlled technique.','Thesis describes 3–5 sets of 8–12 repetitions and references 40–60% of one-repetition maximum.','Resistance and progression require clinician prescription; do not infer a load from this catalogue.','PULMONARY REHAB THESIS.pdf, Patients and Methods, p. 78.',true,false),
('lower-limb-resistance','Lower-limb resistance training','resistance','Leg press, knee extension, sit-to-stand and step-ups.','Select suitable movements based on musculoskeletal status, balance and the individualized clinician plan.','Thesis describes 3–5 sets of 8–12 repetitions.','Clinician supervision and individualized selection are required.','PULMONARY REHAB THESIS.pdf, Patients and Methods, p. 78.',true,false),
('diaphragmatic-breathing','Diaphragmatic breathing','breathing','Breathing technique described in the thesis.','In sitting with shoulders relaxed, inhale slowly through the nose while allowing the abdomen and lower rib cage to expand, then exhale slowly.','Thesis describes 5 minutes, 3–5 sessions per day.','If symptoms worsen or the patient feels unwell, stop and contact the treating team.','PULMONARY REHAB THESIS.pdf, Patients and Methods, p. 79.',false,false),
('pursed-lip-breathing','Pursed-lip breathing','breathing','Controlled breathing with a prolonged gentle exhalation.','Inhale slowly through the nose for about 2 seconds, then exhale gently through partially closed lips for about 4 seconds, as taught by the clinician.','Thesis describes 5 minutes, 1–3 sessions per day.','Do not force the breath or use this as a substitute for the patient’s asthma action plan or prescribed medication.','PULMONARY REHAB THESIS.pdf, Patients and Methods, p. 79.',false,false),
('incentive-spirometer','Incentive spirometer','breathing','Incentive spirometer technique described in the thesis.','Seated, device upright at eye level; follow the clinician’s demonstration for a slow sustained inspiration, brief hold and relaxed exhalation.','Thesis describes 5–10 repetitions, 3–5 sets per session, 3–5 sessions daily.','Use only when specifically included in the clinician-approved plan and after device instruction.','PULMONARY REHAB THESIS.pdf, Patients and Methods, pp. 80–81.',true,false),
('thoracic-cage-stretch','Thoracic cage stretching','flexibility','Stretching category included in the thesis.','Follow the clinician-taught thoracic cage stretch technique; move gently within a comfortable range.','Dose to be set by the treating clinician.','Avoid painful or forced end-range movement.','PULMONARY REHAB THESIS.pdf, Patients and Methods, section IV.',true,false),
('overhead-arm-chest-stretch','Overhead arm chest stretch','flexibility','Chest and upper-body stretch listed in the thesis proposal.','Raise arms only to a comfortable range as demonstrated by the clinician.','Dose to be set by the treating clinician.','Modify for shoulder pain, balance limitations or other musculoskeletal concerns.','User department proposal exercise list.',true,false),
('lateral-side-bending','Lateral side-bending / intercostal stretch','flexibility','Lateral trunk stretch listed in the thesis proposal.','Perform gentle side bending as demonstrated by the clinician, without bouncing or forcing the range.','Dose to be set by the treating clinician.','Stop if pain, dizziness or unusual symptoms occur.','User department proposal exercise list.',true,false),
('cat-cow','Cat-Cow mobility','flexibility','Spinal mobility exercise listed in the thesis proposal.','Perform slow, controlled spinal flexion and extension in a comfortable supported position as demonstrated.','Dose to be set by the treating clinician.','Modify or omit where kneeling, wrist loading or spinal movement is unsuitable.','User department proposal exercise list.',true,false),
('scapular-retraction','Scapular retraction','resistance','Scapular control exercise listed in the thesis proposal.','Gently draw shoulder blades back as demonstrated, avoiding shoulder elevation or painful range.','Dose to be set by the treating clinician.','Stop if shoulder or neck pain develops.','User department proposal exercise list.',true,false),
('asthma-and-medication-education','Asthma and medication adherence','education','Education about asthma and adherence to prescribed medication.','Discuss the patient’s understanding of asthma, prescribed treatment and the importance of following the treating clinician’s instructions.','Reinforce during review as needed.','The platform does not recommend medication changes or replace the patient’s prescribed asthma action plan.','PULMONARY REHAB THESIS.pdf, Summary and Patients and Methods.',false,false),
('inhaler-technique','Inhaler technique training','education','Demonstration and review of inhaler technique.','Ask the patient to demonstrate their own device technique; clinician provides device-specific teaching and re-checks understanding.','Reassess during follow-up.','Use device-specific manufacturer and clinical instructions.','PULMONARY REHAB THESIS.pdf, Summary.',true,false),
('trigger-avoidance','Asthma trigger awareness','education','Discuss recognition and avoidance or management of relevant triggers.','Explore patient-reported triggers and agree practical avoidance or management strategies with the clinical team.','Individualized education.','Avoid implying every patient has the same triggers.','User department proposal and thesis summary.',false,false),
('smoking-cessation','Smoking cessation support','education','Document smoking status and offer appropriate cessation support.','Discuss smoking history and refer to locally available cessation services where appropriate.','As clinically indicated.','Non-judgmental, individualized support.','PULMONARY REHAB THESIS.pdf, Summary.',false,false),
('symptom-self-management','Symptom recognition and self-management','education','Support recognition of symptoms and appropriate use of the patient’s agreed action plan.','Review symptom recognition, when to follow the personal asthma action plan and when to seek urgent care.','Reinforce during follow-up.','Never delay urgent care to complete an app task; the app is not an emergency service.','PULMONARY REHAB THESIS.pdf, Summary.',false,false),
('psychological-support','Psychological support','education','Psychological support is part of the multidisciplinary program.','Document discussion, patient concerns and any referral or support agreed with the clinical team.','As clinically indicated.','This module is not a mental-health diagnostic tool.','PULMONARY REHAB THESIS.pdf, Summary.',false,false),
('mechanical-insufflation-exsufflation','Mechanical insufflation–exsufflation (MI-E)','specialist_airway_clearance','Specialist airway-clearance technique described in the thesis methods.','Not a self-guided exercise. Use only under specialist respiratory-team direction with device-specific protocol.','No default dose supplied in the app.','Specialist clinician-managed equipment procedure; not part of routine unsupervised patient activity.','PULMONARY REHAB THESIS.pdf, Patients and Methods, p. 75.',true,false),
('high-frequency-chest-wall-oscillation','High-frequency chest-wall oscillation (HFCWO)','specialist_airway_clearance','Specialist airway-clearance equipment described in the thesis methods.','Not a self-guided exercise. Use only under specialist respiratory-team direction with device-specific protocol.','No default dose supplied in the app.','Specialist clinician-managed equipment procedure; not part of routine unsupervised patient activity.','PULMONARY REHAB THESIS.pdf, Patients and Methods, p. 75.',true,false)
on conflict (slug) do nothing;
