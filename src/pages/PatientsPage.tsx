import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Search, UserPlus, Users, X, ArrowUpRight, Phone, CalendarDays, Activity } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

type Patient = {
  id: string; patient_user_id?: string | null; full_name: string; date_of_birth: string | null; sex: string | null; phone: string | null; email: string | null
  residence: string | null; occupation: string | null; chief_complaint: string | null; diagnosis: 'bronchial_asthma'
  status: 'active' | 'inactive' | 'completed'; assigned_clinician_id: string; created_at: string
}

const initialForm = { full_name: '', date_of_birth: '', sex: '', phone: '', email: '', residence: '', occupation: '', chief_complaint: '' }

export function PatientsPage() {
  const { user } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Patient | null>(null)
  const [form, setForm] = useState(initialForm)
  const [invitationUrl, setInvitationUrl] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)

  async function loadPatients() {
    if (!supabase) return
    setLoading(true); setError('')
    const { data, error: loadError } = await supabase.from('patients').select('*').order('created_at', { ascending: false })
    if (loadError) setError(loadError.message)
    else setPatients((data ?? []) as Patient[])
    setLoading(false)
  }
  useEffect(() => { void loadPatients() }, [])

  const filtered = useMemo(() => patients.filter(p => `${p.full_name} ${p.phone ?? ''} ${p.email ?? ''}`.toLowerCase().includes(query.toLowerCase())), [patients, query])

  async function createInvitation() {
    if (!supabase || !selected) return
    setInviting(true); setError(''); setNotice(''); setInvitationUrl('')
    const { data, error: inviteError } = await supabase.functions.invoke('create-patient-invitation', { body: { patient_id: selected.id } })
    if (inviteError) setError(inviteError.message)
    else if (data?.activation_url) { setInvitationUrl(data.activation_url); setNotice(`Invitation created for ${data.phone}. It expires ${new Date(data.expires_at).toLocaleString()}.`) }
    else setError(data?.error || 'Unable to create invitation.')
    setInviting(false)
  }

  async function createPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !user) return
    setSaving(true); setError(''); setNotice('')
    if (!form.date_of_birth) { setError('Date of birth is required to confirm the thesis age criterion (18 years or older).'); setSaving(false); return }
    const birthDate = new Date(`${form.date_of_birth}T00:00:00`)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDelta = today.getMonth() - birthDate.getMonth()
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1
    if (age < 18) { setError('This first release is restricted to adults aged 18 years or older, following the supplied thesis.'); setSaving(false); return }
    const payload = {
      full_name: form.full_name.trim(), date_of_birth: form.date_of_birth || null, sex: form.sex || null,
      phone: form.phone.trim() || null, email: form.email.trim().toLowerCase() || null,
      residence: form.residence.trim() || null, occupation: form.occupation.trim() || null,
      chief_complaint: form.chief_complaint.trim() || null, diagnosis: 'bronchial_asthma',
      assigned_clinician_id: user.id, created_by: user.id,
    }
    const updatePayload = Object.fromEntries(Object.entries(payload).filter(([key]) => key !== 'created_by'))
    const saveResult = editingId
      ? await supabase.from('patients').update(updatePayload).eq('id', editingId)
      : await supabase.from('patients').insert(payload)
    if (saveResult.error) setError(saveResult.error.message)
    else { setNotice(editingId ? 'Patient record updated.' : 'Asthma patient record created. Complete the baseline assessment next.'); setShowForm(false); setForm(initialForm); setEditingId(null); await loadPatients() }
    setSaving(false)
  }

  return <div className="content-page">
    <div className="page-intro-row"><div><h2>My asthma patients</h2><p>Patient records assigned to your clinical account.</p></div><button className="primary-button" onClick={() => { setEditingId(null); setForm(initialForm); setShowForm(true) }}><UserPlus size={17} /> Add patient</button></div>
    {notice && <div className="success-banner">{notice}</div>}{error && <div className="form-error page-error">{error}</div>}
    <div className="toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search patients by name, phone or email" /></div><span className="result-count"><Users size={16} /> {filtered.length} patients</span></div>
    <div className="table-card"><div className="table-scroll"><table><thead><tr><th>PATIENT</th><th>CONTACT</th><th>DIAGNOSIS</th><th>RECORD STATUS</th><th>REGISTERED</th><th></th></tr></thead><tbody>
      {loading ? <tr><td colSpan={6} className="table-empty">Loading patient records…</td></tr> : filtered.length === 0 ? <tr><td colSpan={6} className="table-empty">No patients found. Add your first bronchial asthma patient to begin.</td></tr> : filtered.map(patient => <tr key={patient.id} className="clickable-row" onClick={() => setSelected(patient)}><td><div className="user-cell"><div className="avatar table-avatar">{patient.full_name.slice(0,1).toUpperCase()}</div><div><strong>{patient.full_name}</strong><span>{patient.sex ? patient.sex.replace('_',' ') : 'Sex not recorded'}</span></div></div></td><td>{patient.phone || patient.email || '—'}</td><td><span className="role-tag">Bronchial asthma</span></td><td><span className={`status-pill ${patient.status === 'active' ? 'active' : patient.status === 'completed' ? 'pending' : 'inactive'}`}>{patient.status}</span></td><td>{new Date(patient.created_at).toLocaleDateString()}</td><td><ArrowUpRight size={15} color="#7b9994" /></td></tr>)}
    </tbody></table></div></div>
    {showForm && <div className="modal-backdrop" onClick={() => { setShowForm(false); setEditingId(null) }}><section className="modal-card wide-modal" onClick={e => e.stopPropagation()}><div className="modal-header"><div><span className="form-kicker">NEW CLINICAL RECORD</span><h3>{editingId ? 'Edit asthma patient' : 'Register asthma patient'}</h3></div><button className="icon-button" onClick={() => { setShowForm(false); setEditingId(null) }} aria-label="Close"><X size={18} /></button></div><form onSubmit={createPatient} className="modal-form patient-form"><div className="form-section-label">Personal data</div><label>Full name<input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Patient full name" /></label><label>Date of birth<input type="date" required value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></label><label>Gender<select value={form.sex} onChange={e => setForm({ ...form, sex: e.target.value })}><option value="">Not recorded</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="not_recorded">Prefer not to say</option></select></label><label>Contact number<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" /></label><label>Email address<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Optional" /></label><label>Residence<input value={form.residence} onChange={e => setForm({ ...form, residence: e.target.value })} placeholder="Residence" /></label><label>Occupation<input value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })} placeholder="Occupation" /></label><label className="span-two">Chief complaint<textarea rows={3} value={form.chief_complaint} onChange={e => setForm({ ...form, chief_complaint: e.target.value })} placeholder="Document the patient's presenting complaint" /></label><div className="fixed-diagnosis"><Activity size={17} /><div><strong>Diagnosis: Bronchial asthma</strong><span>This first release accepts bronchial asthma patients only.</span></div></div><div className="modal-actions span-two"><button type="button" className="secondary-button" onClick={() => { setShowForm(false); setEditingId(null) }}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving record…' : editingId ? 'Save changes' : 'Create patient record'}</button></div></form></section></div>}
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><section className="modal-card" onClick={e => e.stopPropagation()}><div className="modal-header"><div><span className="form-kicker">PATIENT RECORD</span><h3>{selected.full_name}</h3></div><button className="icon-button" onClick={() => setSelected(null)} aria-label="Close"><X size={18} /></button></div><div className="detail-badges"><span className="role-tag">Bronchial asthma</span><span className={`status-pill ${selected.status}`}>{selected.status}</span></div><div className="patient-detail-grid"><div><span>Date of birth</span><strong>{selected.date_of_birth || 'Not recorded'}</strong></div><div><span>Gender</span><strong>{selected.sex || 'Not recorded'}</strong></div><div><span>Contact</span><strong><Phone size={13} /> {selected.phone || selected.email || 'Not recorded'}</strong></div><div><span>Registered</span><strong><CalendarDays size={13} /> {new Date(selected.created_at).toLocaleDateString()}</strong></div><div className="detail-wide"><span>Residence</span><strong>{selected.residence || 'Not recorded'}</strong></div><div className="detail-wide"><span>Occupation</span><strong>{selected.occupation || 'Not recorded'}</strong></div><div className="detail-wide"><span>Chief complaint</span><strong>{selected.chief_complaint || 'Not recorded'}</strong></div></div><div className="fixed-diagnosis"><Activity size={17} /><div><strong>Next step: baseline assessment</strong><span>mMRC, ACT, 6MWT, spirometry, BMI and HADS are captured in the clinical assessment module.</span></div></div>{selected.patient_user_id ? <div className="invitation-panel"><div><strong>Patient account linked</strong><span>This patient record is already connected to a patient login.</span></div></div> : selected.phone && <div className="invitation-panel">{error && <div className="form-error">{error}</div>}{notice && <div className="success-banner">{notice}</div>}<div><strong>Patient account activation</strong><span>Send a single-use link to the patient. They must verify the phone number recorded above.</span></div><button className="secondary-button" onClick={() => void createInvitation()} disabled={inviting}>{inviting ? 'Creating link…' : 'Create activation link'}</button>{invitationUrl && <><input readOnly value={invitationUrl} /><button className="primary-button" onClick={() => void navigator.clipboard.writeText(invitationUrl)}>Copy activation link</button></>}</div>}<div className="modal-actions"><button className="secondary-button" onClick={() => { setEditingId(selected.id); setForm({ full_name:selected.full_name, date_of_birth:selected.date_of_birth || '', sex:selected.sex || '', phone:selected.phone || '', email:selected.email || '', residence:selected.residence || '', occupation:selected.occupation || '', chief_complaint:selected.chief_complaint || '' }); setSelected(null); setShowForm(true) }}>Edit record</button><button className="primary-button" onClick={() => setSelected(null)}>Close record</button></div></section></div>}
  </div>
}
