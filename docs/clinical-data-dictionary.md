# Clinical Data Dictionary — Bronchial Asthma Rehabilitation

This dictionary is a software-planning translation of the supplied two-page proposal and bronchial asthma thesis. It does not independently validate clinical thresholds or replace departmental approval.

## 1. Patient profile

| Field | Type / format | Source / handling |
|---|---|---|
| Full name | Text | Required personal data |
| Date of birth / age | Date; age derived for display | Source asks for age; store date of birth where permitted and calculate age at assessment |
| Gender / sex | Controlled value | Source asks for gender; final wording and options to be confirmed by department |
| Contact | Phone and optional email | Contact details; patient activation requires verified phone OTP in E.164 format |
| Residence | Text | Source personal data |
| Occupation | Text | Source personal data |
| Chief complaint | Long text | Source personal data |
| Diagnosis | Fixed value: bronchial asthma | This application release is asthma-only |
| Assigned pulmonologist | User reference | Controls clinician record access |
| Patient account | Auth user reference, nullable until activation | Patient may access only their own linked record |

## 2. Eligibility review (clinician-entered)

The thesis describes eligible participants as adults aged 18 years or older with controlled asthma, no exacerbation in the preceding four weeks, persistent symptoms such as dyspnea or reduced exercise tolerance, and willingness to participate.

The thesis lists the following exclusions for clinician review: significant other respiratory diseases as the primary diagnosis; unstable cardiovascular or musculoskeletal conditions that preclude safe exercise; severe cognitive impairment limiting participation or assessment; current participation in another structured exercise/rehabilitation program or participation within the preceding six months; and current pregnancy.

The application should store each criterion as clinician-entered Yes / No / Not assessed, with notes and assessment date. It must not autonomously declare eligibility or clearance.

## 3. Initial assessment and repeat assessment

| Domain | Structured fields |
|---|---|
| History | Full medical history; smoking history; relevant comorbidities; current medications; adherence and reported adverse effects; allergies and precautions |
| Clinical examination | General examination; local chest examination; musculoskeletal examination; clinician notes |
| Dyspnea | mMRC grade (0–4) and assessment date |
| Asthma control | ACT total and individual responses if the department requires them; assessment date |
| Exercise capacity | 6MWT distance (m), pre/post heart rate, pre/post SpO₂, symptoms/observations, test date and assessor |
| Pulmonary function | Spirometry values as recorded by the clinical team, including FEV1, FVC, FEV1/FVC and any additional parameters selected by the department; units and test date must be explicit |
| Anthropometry | Height, weight and BMI; BMI can be calculated from recorded height and weight, while retaining source values |
| Psychological assessment | HADS-A, HADS-D and date; store item-level responses only if the department requires them |
| Education delivered | Inhaler technique; trigger avoidance; smoking-cessation counselling where applicable; medication adherence; symptom recognition/action plan; self-management |

Assessment time points should support baseline and post-program, with interim and longer-term follow-up configurable by the department. Each measurement must retain date, units, assessor and source. Missing values must remain visibly missing rather than being treated as zero.

## 4. Exercise and rehabilitation catalogue

Categories and named activities from the supplied proposal:

- Aerobic training.
- Resistance training: neck training; upper-limb muscle training; lower-limb muscle training.
- Respiratory muscle training: diaphragmatic breathing; pursed-lip breathing; incentive spirometer.
- Flexibility training: thoracic cage stretching; overhead arm chest stretch; lateral side-bending/intercostal stretch; Cat-Cow thoracic mobility; scapular retraction/shoulder squeeze.
- Education: inhaler technique, trigger avoidance, smoking cessation where applicable, medication adherence, symptom recognition and self-management.
- Psychological component: HADS assessment and clinician-directed support/referral workflow.

The thesis additionally describes equipment-based airway clearance (mechanical insufflation-exsufflation with high-frequency chest-wall oscillation). This is not a default home exercise. If represented, it must be clinician-managed and limited to an approved supervised workflow.

Each exercise-library item should store category, name, starting position, steps, media, dose fields, duration, rest, precautions, intended setting (supervised/home), clinical reviewer, approval state, version and approval date. Only approved content may be assigned to patients.

## 5. Protocol configuration and safety flags

The thesis describes an eight-week program, three sessions per week, 90–120 minutes per session. These are protocol-template values, not mandatory settings for every patient.

- Aerobic training: warm-up, conditioning and cool-down phases are described. The thesis contains differing intensity descriptions (70–85% estimated maximum heart rate and 40–60% estimated maximum heart rate, with Borg dyspnea 3–5 also mentioned). The software must not hard-code a default intensity or automatically calculate a target until the department resolves and approves the intended protocol.
- Resistance training: the thesis includes neck, upper-limb and lower-limb exercise prescriptions. Dose, load, sets and repetitions must be selected by the clinician for the individual.
- Diaphragmatic breathing, pursed-lip breathing and incentive spirometer entries should support configurable frequency, duration and repetitions; clinician-approved patient instructions and device-specific guidance are required.
- The thesis describes measuring peak expiratory flow before sessions and deferring exercise when below 60% of personal best or when symptoms are present. This is a source-derived study workflow, not an automatic software clearance rule. It may be enabled only after departmental review, with a clear clinician-defined escalation pathway.
- Exercise stop criteria and symptom escalation must be configured only from the approved departmental protocol. The application must not diagnose deterioration or make autonomous treatment decisions.

## 6. Adherence and follow-up data

For every scheduled activity/session, retain planned date/time, exercise, prescribed dose, sets/repetitions/duration, patient-reported completion, completed sets, actual completion timestamp, skipped/not-completed reason, symptoms/difficulty, optional notes and clinician review status.

Suggested statuses: scheduled/due, started, in progress, completed, skipped/not completed and overdue. Completion is patient-reported unless independently verified; the UI and reports must label it as self-reported adherence.

Follow-up log fields: contact date/time, method, reason, patient-reported status, clinician notes, decision/action, responsible staff member and next review date.

## 7. Implemented database mapping

| Table | Purpose | Key handling |
|---|---|---|
| `profiles` | Auth-linked account and role | New accounts default to the least-privileged patient role; staff roles are set through administrator workflows. |
| `patients` | Adult bronchial asthma patient record | `patient_user_id` is not client-writable; it is linked only by the phone-verified invitation transaction. |
| `patient_invitations` | Single-use patient activation | Stores only a SHA-256 token hash, invited phone, expiry and use timestamp; authenticated clients have no direct table access. |
| `clinical_assessments` | Longitudinal assessments | Repeated baseline/interim/post-program/follow-up records; structured score columns plus JSONB for grouped observations. |
| `rehab_library_items` | Exercise and education catalogue | Version, active/approved state, safety notes and supervision requirement; patient access is restricted to active approved content. |
| `rehab_programs` | Individual clinician plans | Editable weeks, weekly frequency, session-duration range and draft/active/on-hold/completed state. |
| `rehab_program_items` | Prescribed activity details | Snapshot of library item title/instructions and individualized frequency, sets, repetitions, duration, intensity, rest and notes. |
| `rehab_session_logs` | Patient-reported activity | Completion status, completed minutes, difficulty, symptoms and missed reason; not objective exercise monitoring. |
| `follow_up_tasks` | Clinician worklist | Patient, assigned clinician, due date, status and follow-up notes. |
| `app_notifications` | In-app updates | User-scoped notifications for patient activity updates and plan approval. |
| `audit_logs` | Audit trail | Records key patient, assessment and program lifecycle events without copying clinical narrative into audit metadata. |

The current assessment UI records a single ACT total and HADS-A/HADS-D totals. Item-level questionnaires are not stored in this implementation. The current report supports CSV export and browser print-to-PDF; it is not a validated statistical analysis module.
