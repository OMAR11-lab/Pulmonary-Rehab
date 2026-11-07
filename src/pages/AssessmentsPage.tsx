import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, ClipboardList, Plus, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

type Patient = { id: string; full_name: string; date_of_birth: string; phone: string | null }
type Assessment = { id: string; patient_id: string; assessment_type: string; assessment_date: string; mmrc_score: number | null; act_score: number | null; hads_anxiety: number | null; hads_depression: number | null; six_mwt: Record<string, unknown>; spirometry: Record<string, unknown>; anthropometry: Record<string, unknown>; clinical_notes: string | null }
const empty = {
  patient_id: '', assessment_type: 'baseline', assessment_date: new Date().toISOString().slice(0, 10),
  history: '', smoking_history: '', comorbidities: '', medications: '', exacerbations: '', examination: '',
  eligibility: 'pending', eligibility_notes: '', eligibility_age: 'not_assessed', eligibility_controlled: 'not_assessed', eligibility_no_exacerbation: 'not_assessed', eligibility_symptoms: 'not_assessed', eligibility_willing: 'not_assessed', eligibility_alternative_resp: 'not_assessed', eligibility_cardiovascular_msk: 'not_assessed', eligibility_cognitive: 'not_assessed', eligibility_recent_rehab: 'not_assessed', eligibility_pregnancy: 'not_assessed', mmrc_score: '', act_score: '',
  walk_distance_m: '', walk_hr_pre: '', walk_hr_post: '', walk_spo2_pre: '', walk_spo2_post: '', walk_borg: '', walk_observations: '',
  fev1_l: '', fev1_percent: '', fvc_l: '', fvc_percent: '', fev1_fvc: '', mef_25_75: '',
  height_cm: '', weight_kg: '', bmi: '', hads_anxiety: '', hads_depression: '',
  education_asthma: false, education_medication: false, education_inhaler: false, education_triggers: false, education_smoking: false, education_self_management: false, education_psychological: false,
  notes: '',
}
type FormState = typeof empty

export function AssessmentsPage() {
  const { user } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [records, setRecords] = useState<Assessment[]>([])
  const [form, setForm] = useState<FormState>(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showForm, setShowForm] = useState(false)

  async function load() {
    if (!supabase) return
    setLoading(true)
    const [p, a] = await Promise.all([
      supabase.from('patients').select('id,full_name,date_of_birth,phone').order('full_name'),
      supabase.from('clinical_assessments').select('id,patient_id,assessment_type,assessment_date,mmrc_score,act_score,hads_anxiety,hads_depression,six_mwt,spirometry,anthropometry,clinical_notes').order('assessment_date', { ascending: false }).limit(150),
    ])
    if (p.error) setError(p.error.message); else setPatients((p.data ?? []) as Patient[])
    if (a.error) setError(a.error.message); else setRecords((a.data ?? []) as Assessment[])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])
  const selectedPatient = useMemo(() => patients.find(p => p.id === form.patient_id), [patients, form.patient_id])
  const patientName = (id: string) => patients.find(p => p.id === id)?.full_name ?? 'Patient'
  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForm(prev => ({ ...prev, [key]: value })) }
  function numberOrNull(value: string) { return value.trim() === '' ? null : Number(value) }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !user) return
    setSaving(true); setError(''); setNotice('')
    const calculatedBmi = form.height_cm && form.weight_kg ? Number((Number(form.weight_kg) / ((Number(form.height_cm) / 100) ** 2)).toFixed(1)) : null
    const payload = {
      patient_id: form.patient_id, assessment_type: form.assessment_type, assessment_date: form.assessment_date, assessor_id: user.id,
      clinical_history: { history: form.history, smoking_history: form.smoking_history, comorbidities: form.comorbidities, medications: form.medications, exacerbations: form.exacerbations },
      clinical_examination: { findings: form.examination },
      eligibility_review: { clinician_status: form.eligibility, notes: form.eligibility_notes, criteria: { age_18_or_older: form.eligibility_age, controlled_asthma: form.eligibility_controlled, no_exacerbation_in_preceding_4_weeks: form.eligibility_no_exacerbation, persistent_symptoms: form.eligibility_symptoms, willing_to_participate: form.eligibility_willing, significant_alternative_respiratory_disease: form.eligibility_alternative_resp, unstable_cardiovascular_or_musculoskeletal_condition: form.eligibility_cardiovascular_msk, severe_cognitive_impairment: form.eligibility_cognitive, recent_structured_rehabilitation: form.eligibility_recent_rehab, pregnancy: form.eligibility_pregnancy } },
      mmrc_score: numberOrNull(form.mmrc_score), act_score: numberOrNull(form.act_score),
      six_mwt: { distance_m: numberOrNull(form.walk_distance_m), heart_rate_pre_bpm: numberOrNull(form.walk_hr_pre), heart_rate_post_bpm: numberOrNull(form.walk_hr_post), spo2_pre_percent: numberOrNull(form.walk_spo2_pre), spo2_post_percent: numberOrNull(form.walk_spo2_post), borg_dyspnea: numberOrNull(form.walk_borg), observations: form.walk_observations },
      spirometry: { fev1_l: numberOrNull(form.fev1_l), fev1_percent_predicted: numberOrNull(form.fev1_percent), fvc_l: numberOrNull(form.fvc_l), fvc_percent_predicted: numberOrNull(form.fvc_percent), fev1_fvc_percent: numberOrNull(form.fev1_fvc), mef_25_75_l_s: numberOrNull(form.mef_25_75) },
      anthropometry: { height_cm: numberOrNull(form.height_cm), weight_kg: numberOrNull(form.weight_kg), bmi: numberOrNull(form.bmi) ?? calculatedBmi },
      hads_anxiety: numberOrNull(form.hads_anxiety), hads_depression: numberOrNull(form.hads_depression),
      education_delivered: { asthma: form.education_asthma, medication_adherence: form.education_medication, inhaler_technique: form.education_inhaler, trigger_avoidance: form.education_triggers, smoking_cessation: form.education_smoking, symptom_self_management: form.education_self_management, psychological_support: form.education_psychological },
      clinical_notes: form.notes.trim() || null,
    }
    const { error: saveError } = await supabase.from('clinical_assessments').insert(payload)
    if (saveError) setError(saveError.message)
    else { setNotice('Assessment saved. Review the recorded findings clinically; no automated eligibility decision has been made.'); setForm({ ...empty, patient_id: form.patient_id, assessment_type: form.assessment_type === 'baseline' ? 'interim' : form.assessment_type }); setShowForm(false); await load() }
    setSaving(false)
  }
  return <div className="content-page">
    <div className="page-intro-row"><div><h2>Clinical assessments</h2><p>Record baseline and follow-up outcomes for adult bronchial asthma patients.</p></div><button className="primary-button" onClick={() => setShowForm(true)} disabled={!patients.length}><Plus size={17} /> New assessment</button></div>
    <div className="clinical-note"><Activity size={17} /><div><strong>Clinical record only</strong><span>Eligibility, interpretation and exercise clearance remain decisions for the treating clinician. The app does not diagnose, prescribe or automatically clear a patient for exercise.</span></div></div>
    {notice && <div className="success-banner">{notice}</div>}{error && <div className="form-error page-error">{error}</div>}
    <div className="assessment-list">{loading ? <div className="table-empty">Loading assessments…</div> : records.length === 0 ? <div className="empty-state"><ClipboardList size={30}/><strong>No assessments recorded yet</strong><span>Create a baseline assessment after registering an asthma patient.</span></div> : records.map(record => <article className="assessment-card" key={record.id}><div className="assessment-card-head"><div><span className="form-kicker">{record.assessment_type.replace('_',' ').replace('_',' ')}</span><h3>{patientName(record.patient_id)}</h3><span className="assessment-date">{new Date(record.assessment_date).toLocaleDateString()}</span></div><span className="role-tag">Bronchial asthma</span></div><div className="assessment-metrics">{[['mMRC', record.mmrc_score ?? '—'], ['ACT', record.act_score ?? '—'], ['6MWT', `${record.six_mwt?.distance_m ?? '—'} m`], ['HADS-A', record.hads_anxiety ?? '—'], ['HADS-D', record.hads_depression ?? '—'], ['BMI', record.anthropometry?.bmi ?? '—']].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></article>)}</div>
    {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><section className="modal-card assessment-modal" onClick={e => e.stopPropagation()}><div className="modal-header"><div><span className="form-kicker">LONGITUDINAL CLINICAL RECORD</span><h3>New assessment</h3></div><button type="button" className="icon-button" onClick={() => setShowForm(false)}>×</button></div>
      <form className="modal-form assessment-form" onSubmit={save}>
        <div className="form-section-label">Patient and review</div>
        <label className="span-two">Patient<select required value={form.patient_id} onChange={e => update('patient_id', e.target.value)}><option value="">Select assigned patient</option>{patients.map(p => <option key={p.id} value={p.id}>{p.full_name} · DOB {p.date_of_birth}</option>)}</select></label>
        {selectedPatient && <p className="field-note span-two">Record for {selectedPatient.full_name}. Diagnosis is fixed to bronchial asthma.</p>}
        <label>Assessment stage<select value={form.assessment_type} onChange={e => update('assessment_type', e.target.value)}><option value="baseline">Baseline</option><option value="interim">Interim</option><option value="post_program">Post-program</option><option value="follow_up">Follow-up</option></select></label>
        <label>Assessment date<input type="date" required value={form.assessment_date} onChange={e => update('assessment_date', e.target.value)} /></label>
        <div className="form-section-label">Eligibility review — clinician recorded</div>
        <label>Review status<select value={form.eligibility} onChange={e => update('eligibility', e.target.value)}><option value="pending">Not reviewed</option><option value="eligible">Clinician considers eligible</option><option value="deferred">Deferred for clinical review</option><option value="not_eligible">Clinician considers not eligible</option></select></label>
        <label>Review notes<input value={form.eligibility_notes} onChange={e => update('eligibility_notes', e.target.value)} placeholder="Document rationale / limitations" /></label>
        <div className="eligibility-grid span-two">{([['eligibility_age','Age 18 years or older'],['eligibility_controlled','Asthma controlled'],['eligibility_no_exacerbation','No exacerbation in preceding 4 weeks'],['eligibility_symptoms','Persistent symptoms (dyspnea / reduced exercise tolerance)'],['eligibility_willing','Willing to participate'],['eligibility_alternative_resp','Significant alternative respiratory disease present'],['eligibility_cardiovascular_msk','Unstable cardiovascular / musculoskeletal condition present'],['eligibility_cognitive','Severe cognitive impairment present'],['eligibility_recent_rehab','Recent structured rehabilitation present'],['eligibility_pregnancy','Pregnancy present']] as const).map(([key,label])=><label key={key}>{label}<select value={form[key]} onChange={e=>update(key,e.target.value)}><option value="not_assessed">Not assessed</option><option value="yes">Yes</option><option value="no">No</option></select></label>)}</div><p className="field-note span-two">For exclusion criteria, “Yes” means the condition is present. This checklist records clinician findings only and does not calculate eligibility or exercise clearance.</p>
        <div className="form-section-label">History and examination</div>
        <label className="span-two">Medical / asthma history<textarea rows={2} value={form.history} onChange={e => update('history', e.target.value)} /></label>
        <label>Smoking history<input value={form.smoking_history} onChange={e => update('smoking_history', e.target.value)} /></label><label>Comorbidities<input value={form.comorbidities} onChange={e => update('comorbidities', e.target.value)} /></label>
        <label className="span-two">Current asthma medications<textarea rows={2} value={form.medications} onChange={e => update('medications', e.target.value)} /></label>
        <label className="span-two">Exacerbations / recent events<textarea rows={2} value={form.exacerbations} onChange={e => update('exacerbations', e.target.value)} /></label>
        <label className="span-two">Clinical examination<textarea rows={3} value={form.examination} onChange={e => update('examination', e.target.value)} /></label>
        <div className="form-section-label">Asthma control and dyspnea</div>
        <label>mMRC grade (0–4)<input type="number" min="0" max="4" value={form.mmrc_score} onChange={e => update('mmrc_score', e.target.value)} /></label>
        <label>ACT total score (5–25)<input type="number" min="5" max="25" value={form.act_score} onChange={e => update('act_score', e.target.value)} /></label>
        <div className="form-section-label">6-minute walk test</div>
        <label>Distance (metres)<input type="number" min="0" step="0.1" value={form.walk_distance_m} onChange={e => update('walk_distance_m', e.target.value)} /></label>
        <label>Borg dyspnea score<input type="number" min="0" max="10" step="0.5" value={form.walk_borg} onChange={e => update('walk_borg', e.target.value)} /></label>
        <label>Heart rate before (bpm)<input type="number" min="0" value={form.walk_hr_pre} onChange={e => update('walk_hr_pre', e.target.value)} /></label><label>Heart rate after (bpm)<input type="number" min="0" value={form.walk_hr_post} onChange={e => update('walk_hr_post', e.target.value)} /></label>
        <label>SpO₂ before (%)<input type="number" min="0" max="100" step="0.1" value={form.walk_spo2_pre} onChange={e => update('walk_spo2_pre', e.target.value)} /></label><label>SpO₂ after (%)<input type="number" min="0" max="100" step="0.1" value={form.walk_spo2_post} onChange={e => update('walk_spo2_post', e.target.value)} /></label>
        <label className="span-two">6MWT observations<textarea rows={2} value={form.walk_observations} onChange={e => update('walk_observations', e.target.value)} /></label>
        <div className="form-section-label">Spirometry</div>
        <label>FEV₁ (L)<input type="number" min="0" step="0.01" value={form.fev1_l} onChange={e => update('fev1_l', e.target.value)} /></label><label>FEV₁ (% predicted)<input type="number" min="0" step="0.1" value={form.fev1_percent} onChange={e => update('fev1_percent', e.target.value)} /></label>
        <label>FVC (L)<input type="number" min="0" step="0.01" value={form.fvc_l} onChange={e => update('fvc_l', e.target.value)} /></label><label>FVC (% predicted)<input type="number" min="0" step="0.1" value={form.fvc_percent} onChange={e => update('fvc_percent', e.target.value)} /></label>
        <label>FEV₁/FVC (%)<input type="number" min="0" max="100" step="0.1" value={form.fev1_fvc} onChange={e => update('fev1_fvc', e.target.value)} /></label><label>MEF₂₅–₇₅ (L/s)<input type="number" min="0" step="0.01" value={form.mef_25_75} onChange={e => update('mef_25_75', e.target.value)} /></label>
        <div className="form-section-label">Anthropometry and psychological assessment</div>
        <label>Height (cm)<input type="number" min="0" step="0.1" value={form.height_cm} onChange={e => update('height_cm', e.target.value)} /></label><label>Weight (kg)<input type="number" min="0" step="0.1" value={form.weight_kg} onChange={e => update('weight_kg', e.target.value)} /></label>
        <label>BMI (kg/m²)<input type="number" min="0" step="0.1" value={form.bmi} onChange={e => update('bmi', e.target.value)} /></label><label>HADS anxiety (0–21)<input type="number" min="0" max="21" value={form.hads_anxiety} onChange={e => update('hads_anxiety', e.target.value)} /></label>
        <label>HADS depression (0–21)<input type="number" min="0" max="21" value={form.hads_depression} onChange={e => update('hads_depression', e.target.value)} /></label>
        <div className="form-section-label">Education delivered</div>
        <div className="education-checks span-two">{([['education_asthma','Asthma education'],['education_medication','Medication adherence'],['education_inhaler','Inhaler technique'],['education_triggers','Trigger avoidance'],['education_smoking','Smoking cessation'],['education_self_management','Symptom recognition and self-management'],['education_psychological','Psychological support']] as const).map(([key,label]) => <label className="check-label" key={key}><input type="checkbox" checked={form[key]} onChange={e => update(key, e.target.checked)} />{label}</label>)}</div>
        <label className="span-two">Clinical notes<textarea rows={3} value={form.notes} onChange={e => update('notes', e.target.value)} /></label>
        <div className="modal-actions span-two"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" disabled={saving || !patients.length}><Save size={16}/>{saving ? 'Saving…' : 'Save assessment'}</button></div>
      </form></section></div>}
  </div>
}
