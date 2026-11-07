# Respira pre-pilot acceptance checklist

Run this checklist against a non-production Supabase project using separate administrator, pulmonologist and patient accounts. Do not use real patient data until institutional approval and security review are complete.

## Deployment and configuration

- [ ] Apply all six migrations in timestamp order.
- [ ] Create the first administrator and verify that the profile role is `admin`.
- [ ] Configure staff email SMTP and patient phone OTP/SMS provider.
- [ ] Configure Vercel `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- [ ] Set Supabase Edge Function secret `APP_URL` to the deployed frontend URL.
- [ ] Deploy `admin-create-user` and `create-patient-invitation` with JWT verification enabled.
- [ ] Run `npm install`, `npm run build` and `npm run lint` in a network-enabled environment.

## Administrator

- [ ] Sign in with email and password.
- [ ] Invite an administrator and a pulmonologist; confirm invitation links open password setup.
- [ ] Confirm a patient cannot use the administrator account-creation workflow to gain staff privileges.
- [ ] Review and approve/unapprove library entries.
- [ ] Confirm administrator access is blocked when `profiles.is_active` is false.

## Pulmonologist

- [ ] Sign in and confirm only assigned patient records are visible.
- [ ] Create an adult bronchial asthma patient record.
- [ ] Confirm under-18 registration is blocked by both UI and database trigger.
- [ ] Edit a patient record and confirm `created_by` and `patient_user_id` cannot be changed from the client.
- [ ] Create a patient invitation; verify a link is returned and expires after 24 hours.
- [ ] Confirm a patient without a valid E.164 phone number cannot be invited.
- [ ] Confirm another pulmonologist cannot create an invitation for an unassigned patient.
- [ ] Activate an invitation using the matching phone OTP; confirm the patient is linked.
- [ ] Confirm an expired, reused or phone-mismatched invitation is rejected.
- [ ] Create baseline and follow-up assessments; validate mMRC, ACT and HADS range constraints.
- [ ] Confirm assessment records for another clinician's patients are inaccessible.
- [ ] Review library items; approve only content cleared by the department.
- [ ] Create a multi-activity draft program; confirm no aerobic intensity is prefilled.
- [ ] Activate a program and confirm only the linked patient can view it.
- [ ] Review patient-reported session updates and complete a follow-up task.
- [ ] Export an outcomes CSV and verify that missing measurements remain blank.

## Patient

- [ ] Activate account with the phone number already stored in the patient record.
- [ ] Sign in using phone OTP.
- [ ] Confirm only the linked patient record, approved library entries and approved active plan are visible.
- [ ] Confirm draft/on-hold plans and unapproved library items are not visible.
- [ ] Submit completed, partially completed and not completed session reports.
- [ ] Confirm symptom/difficulty fields are saved and labelled as self-reported.
- [ ] Confirm patient cannot edit assessments, prescriptions, patient linkage or another patient's data.
- [ ] Confirm plan approval and notifications are visible in the patient workspace.

## Clinical governance and usability

- [ ] Department approves the eligibility review wording and exclusion checklist.
- [ ] Department resolves the thesis aerobic intensity discrepancy before setting intensity rules.
- [ ] Department approves exercise instructions, dose templates, stop criteria and escalation contacts.
- [ ] Peak-flow workflow is not used as autonomous clearance unless a formal approved protocol is added.
- [ ] MI-E/HFCWO are restricted to specialist clinician-managed pathways.
- [ ] Consent, retention, access, audit, backup and incident-response policies are approved.
- [ ] Validate responsive layouts, keyboard access, error handling and patient comprehension.
