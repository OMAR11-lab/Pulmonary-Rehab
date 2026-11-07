# Implementation Progress

## Confirmed project constraints

- Patient population: bronchial asthma only, based on the supplied thesis.
- Roles: administrator, pulmonologist and patient.
- Build style: complete application delivered in sequential implementation phases.
- Frontend/backend/deployment target: React + TypeScript + Vite, Supabase and Vercel.
- Final delivery preference: one consolidated ZIP after the implementation is complete, rather than a separate ZIP for every phase.

## Current work

### Phase 1 — Foundation and access control
Implemented: React/Vite/TypeScript shell, Supabase email/password staff authentication, role-based route protection, administrator invitations, profile/patient schema, RLS and audit logging.

### Phase 2 — Patient management and activation
Implemented: adult asthma-only patient registration, clinician-scoped search/list/detail, edit workflow, protected single-use invitation creation, 24-hour token expiry, verified phone OTP activation and patient phone-OTP login. Patient linkage is completed by a transaction that checks token hash, expiry, phone match, account role and one-time use.

### Phase 3 — Clinical assessments
Implemented: repeatable baseline/interim/post-program/follow-up records with history, smoking history, comorbidities, medication history, exacerbations, examination, clinician-recorded eligibility review, mMRC, ACT, 6MWT, spirometry, anthropometry/BMI, HADS and education delivered. RLS limits pulmonologists to assigned patient records.

### Phase 4 — Exercise and education library
Implemented: thesis-derived aerobic, resistance, breathing, flexibility, asthma education, inhaler technique, trigger awareness, smoking cessation, self-management and psychological support resources. Content can be approved/unapproved for patient view. MI-E and HFCWO are marked specialist clinician-managed.

### Phase 5 — Individualized rehabilitation plans
Implemented: draft program builder with editable duration, weekly sessions, session duration range and activity-level frequency, sets, repetitions, duration, intensity, rest and notes. Patient visibility requires clinician activation/approval. Aerobic intensity is not pre-populated because the thesis gives conflicting ranges.

### Phase 6 — Patient portal and adherence
Implemented: patient view of approved plan activities and self-reported session status, minutes, difficulty, symptoms, missed reasons and notes. Clinicians can review submitted activity logs. These are not objective exercise measurements.

### Phase 7 — Follow-up and notifications
Implemented: clinician follow-up task creation/completion, in-app patient activity notifications to the assigned clinician and patient notification when a plan is approved. Automated SMS/push delivery and scheduled reminder processing are not yet implemented.

### Phase 8 — Reports and outcomes
Implemented: baseline versus post-program/follow-up comparison for ACT, mMRC, 6MWT, spirometry, BMI and HADS; self-reported activity totals; CSV export and browser print-to-PDF. This is descriptive reporting, not automated clinical interpretation.

## Validation still required

- Full dependency install, `npm run build` and `npm run lint`; package registry timed out in the current environment. Syntax-only transpilation passed for 20 frontend source files.
- Apply all six SQL migrations in a dedicated Supabase project and test policies with distinct admin, pulmonologist and patient accounts.
- Configure and test Supabase SMS OTP and SMTP delivery; deploy both Edge Functions and verify invitation expiry/reuse and phone matching.
- Departmental approval of the exercise library, eligibility workflow, dose/intensity rules, emergency instructions, consent and data governance before any live patient use.
- End-to-end and security testing, including role isolation, report export and patient data access.

## Clinical safeguards carried forward

- No automatic eligibility clearance, diagnosis or treatment decisions.
- No default aerobic intensity until the thesis discrepancy (70–85% vs 40–60% estimated maximum heart rate; Borg dyspnea 3–5 also mentioned) is resolved by departmental clinical reviewers.
- Peak-flow pre-session logic is not enabled as an autonomous clearance rule. The thesis describes deferring exercise below 60% of personal best or when symptoms are present; any implementation requires an approved clinical pathway.
- Patient completion is labelled self-reported adherence.
- Equipment-dependent airway clearance (MI-E/HFCWO) is not a self-guided exercise.
- The app does not replace prescribed asthma medication, an asthma action plan, urgent care or direct clinical advice.
