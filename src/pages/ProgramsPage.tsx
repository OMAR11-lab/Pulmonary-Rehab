import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, CalendarDays, CheckCircle2, ClipboardList, Plus, Save, ShieldAlert, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

type Patient = { id: string; full_name: string }
type Program = {
  id: string; patient_id: string; title: string; start_date: string; end_date: string | null
  planned_weeks: number; sessions_per_week: number; session_duration_min: number | null
  session_duration_max: number | null; status: string; approved_at: string | null; clinician_notes: string | null
}
type Item = {
  id: string; program_id: string; library_item_id: string | null; exercise_title: string; category: string
  instructions: string | null; frequency: string | null; sets: number | null; repetitions: number | null
  duration_minutes: number | null; intensity: string | null; rest_seconds: number | null; clinician_notes: string | null
}
type Log = {
  id: string; program_id: string; patient_id: string; session_date: string; completion_status: string
  completed_minutes: number | null; perceived_difficulty: string | null; symptoms: string | null
  missed_reason: string | null; patient_notes: string | null
}
type Library = { id: string; slug: string; title: string; category: string; instructions: string }
type ActivityDraft = {
  id?: string; library_item_id: string | null; exercise_title: string; category: string; instructions: string
  frequency: string; sets: number | null; repetitions: number | null; duration_minutes: number | null
  intensity: string | null; rest_seconds: number | null; clinician_notes: string | null
}
type PlanForm = {
  patient_id: string; title: string; start_date: string; planned_weeks: string; sessions_per_week: string
  session_duration_min: string; session_duration_max: string; clinician_notes: string
}
const blank: PlanForm = {
  patient_id: '', title: 'Bronchial asthma rehabilitation plan',
  start_date: new Date().toISOString().slice(0, 10), planned_weeks: '8', sessions_per_week: '3',
  session_duration_min: '90', session_duration_max: '120', clinician_notes: ''
}
const categoryAr: Record<string, string> = {
  aerobic: 'تمارين هوائية', resistance: 'تمارين المقاومة', breathing: 'تمارين التنفس',
  flexibility: 'تمارين المرونة', education: 'تثقيف صحي', specialist_airway_clearance: 'تقنيات متخصصة لتنظيف مجرى الهواء'
}
const statusAr: Record<string, string> = {
  draft: 'مسودة', active: 'نشطة', on_hold: 'معلّقة', completed: 'مكتملة',
  completed_status: 'مكتملة', partially_completed: 'مكتملة جزئياً', not_completed: 'لم تكتمل'
}
const titleAr: Record<string, string> = {
  'aerobic-treadmill-walking': 'المشي على جهاز المشي',
  'neck-resistance': 'تمارين مقاومة الرقبة',
  'upper-limb-resistance': 'تمارين مقاومة الأطراف العلوية',
  'lower-limb-resistance': 'تمارين مقاومة الأطراف السفلية',
  'diaphragmatic-breathing': 'التنفس الحجابي',
  'pursed-lip-breathing': 'التنفس مع ضم الشفتين',
  'incentive-spirometer': 'تمارين جهاز تحفيز التنفس',
  'thoracic-cage-stretch': 'تمارين إطالة القفص الصدري',
  'overhead-arm-chest-stretch': 'إطالة الصدر برفع الذراعين',
  'lateral-side-bending': 'إطالة الجذع جانبياً',
  'cat-cow': 'تمرين القطة والبقرة',
  'scapular-retraction': 'تمرين ضم لوحي الكتف',
  'asthma-and-medication-education': 'التثقيف حول الربو والالتزام بالعلاج',
  'inhaler-technique': 'التدريب على استخدام البخاخ',
  'trigger-avoidance': 'التوعية بمحفزات الربو',
  'smoking-cessation': 'دعم الإقلاع عن التدخين',
  'symptom-self-management': 'التعرف على الأعراض والتعامل معها',
  'psychological-support': 'الدعم النفسي',
  'mechanical-insufflation-exsufflation': 'تقنية الشهيق والزفير الميكانيكي',
  'high-frequency-chest-wall-oscillation': 'اهتزاز جدار الصدر عالي التردد'
}
const difficultyAr: Record<string, string> = {
  easy: 'سهل', manageable: 'مقبول', difficult: 'صعب', very_difficult: 'صعب جداً'
}
const completionAr: Record<string, string> = {
  completed: 'مكتملة', partially_completed: 'مكتملة جزئياً', not_completed: 'لم تكتمل'
}

function toDraft(item: Item): ActivityDraft {
  return {
    id: item.id, library_item_id: item.library_item_id, exercise_title: item.exercise_title,
    category: item.category, instructions: item.instructions ?? '', frequency: item.frequency ?? '',
    sets: item.sets, repetitions: item.repetitions, duration_minutes: item.duration_minutes,
    intensity: item.intensity, rest_seconds: item.rest_seconds, clinician_notes: item.clinician_notes
  }
}

export function ProgramsPage() {
  const { profile } = useAuth()
  const isPatient = profile?.role === 'patient'
  const [patients, setPatients] = useState<Patient[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [library, setLibrary] = useState<Library[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<PlanForm>(blank)
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  const [selectedExercise, setSelectedExercise] = useState('')
  const [itemFrequency, setItemFrequency] = useState('As prescribed')
  const [itemSets, setItemSets] = useState('')
  const [itemReps, setItemReps] = useState('')
  const [itemDuration, setItemDuration] = useState('')
  const [itemIntensity, setItemIntensity] = useState('')
  const [itemNotes, setItemNotes] = useState('')
  const [activities, setActivities] = useState<ActivityDraft[]>([])
  const [editingActivityIndex, setEditingActivityIndex] = useState<number | null>(null)
  const [logProgram, setLogProgram] = useState('')
  const [logStatus, setLogStatus] = useState('completed')
  const [logMinutes, setLogMinutes] = useState('')
  const [logDifficulty, setLogDifficulty] = useState('manageable')
  const [logSymptoms, setLogSymptoms] = useState('')
  const [logMissed, setLogMissed] = useState('')
  const [logNotes, setLogNotes] = useState('')

  async function load() {
    if (!supabase) return
    setLoading(true)
    const [p, r, l] = await Promise.all([
      supabase.from('patients').select('id,full_name').order('full_name'),
      supabase.from('rehab_programs').select('*').order('start_date', { ascending: false }).limit(100),
      supabase.from('rehab_library_items').select('id,slug,title,category,instructions').eq('active', true).order('title')
    ])
    if (p.error) setError(p.error.message); else setPatients((p.data ?? []) as Patient[])
    if (r.error) setError(r.error.message); else setPrograms((r.data ?? []) as Program[])
    if (l.error) setError(l.error.message); else setLibrary((l.data ?? []) as Library[])
    if (r.data?.length) {
      const ids = r.data.map((program) => program.id)
      const [i, sessionLogs] = await Promise.all([
        supabase.from('rehab_program_items').select('*').in('program_id', ids).order('sort_order'),
        supabase.from('rehab_session_logs').select('*').in('program_id', ids).order('session_date', { ascending: false }).limit(200)
      ])
      if (i.error) setError(i.error.message); else setItems((i.data ?? []) as Item[])
      if (sessionLogs.error) setError(sessionLogs.error.message); else setLogs((sessionLogs.data ?? []) as Log[])
    } else {
      setItems([])
      setLogs([])
    }
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const visiblePrograms = useMemo(
    () => isPatient ? programs.filter((p) => p.status === 'active' && p.approved_at) : programs,
    [programs, isPatient]
  )
  const patientName = (id: string) => patients.find((p) => p.id === id)?.full_name ?? (isPatient ? '' : 'Patient')
  const programItems = (id: string) => items.filter((i) => i.program_id === id)
  const programLogs = (id: string) => logs.filter((l) => l.program_id === id)
  const trStatus = (value: string) => isPatient ? (statusAr[value] ?? value) : value.replaceAll('_', ' ')
  const trCategory = (value: string) => isPatient ? (categoryAr[value] ?? value.replaceAll('_', ' ')) : value.replaceAll('_', ' ')
  const displayItemTitle = (item: Item) => {
    if (!isPatient) return item.exercise_title
    const slug = library.find((entry) => entry.id === item.library_item_id)?.slug
    return (slug && titleAr[slug]) || (item.exercise_title === 'Bronchial asthma rehabilitation plan' ? 'خطة تأهيل الربو الشعبي' : item.exercise_title)
  }

  function resetEditor() {
    setShowForm(false); setEditingProgram(null); setForm(blank); setActivities([])
    setSelectedExercise(''); setItemFrequency('As prescribed'); setItemSets(''); setItemReps('')
    setItemDuration(''); setItemIntensity(''); setItemNotes(''); setEditingActivityIndex(null)
  }
  function addActivity() {
    const lib = library.find((x) => x.id === selectedExercise)
    if (!lib) { setError(isPatient ? 'يرجى اختيار تمرين أو مادة تثقيفية أولاً.' : 'Choose an exercise or education item first.'); return }
    const nextActivity: ActivityDraft = {
      ...(editingActivityIndex !== null && activities[editingActivityIndex]?.id ? { id: activities[editingActivityIndex].id } : {}),
      library_item_id: lib.id, exercise_title: lib.title, category: lib.category, instructions: lib.instructions,
      frequency: itemFrequency, sets: itemSets ? Number(itemSets) : null, repetitions: itemReps ? Number(itemReps) : null,
      duration_minutes: itemDuration ? Number(itemDuration) : null, intensity: itemIntensity || null,
      rest_seconds: editingActivityIndex !== null ? activities[editingActivityIndex]?.rest_seconds ?? null : null,
      clinician_notes: itemNotes || null
    }
    setActivities((old) => editingActivityIndex === null
      ? [...old, nextActivity]
      : old.map((activity, index) => index === editingActivityIndex ? nextActivity : activity))
    setEditingActivityIndex(null); setSelectedExercise(''); setItemFrequency('As prescribed')
    setItemSets(''); setItemReps(''); setItemDuration(''); setItemIntensity(''); setItemNotes(''); setError('')
  }

  function startEditActivity(index: number) {
    const activity = activities[index]
    if (!activity) return
    setEditingActivityIndex(index); setSelectedExercise(activity.library_item_id ?? '')
    setItemFrequency(activity.frequency); setItemSets(activity.sets == null ? '' : String(activity.sets))
    setItemReps(activity.repetitions == null ? '' : String(activity.repetitions))
    setItemDuration(activity.duration_minutes == null ? '' : String(activity.duration_minutes))
    setItemIntensity(activity.intensity ?? ''); setItemNotes(activity.clinician_notes ?? '')
  }

  async function openEdit(program: Program) {
    if (!supabase) return
    setError(''); setNotice('')
    const { data, error: itemError } = await supabase.from('rehab_program_items').select('*').eq('program_id', program.id).order('sort_order')
    if (itemError) { setError(itemError.message); return }
    setEditingProgram(program)
    setItems((data ?? []) as Item[])
    setForm({
      patient_id: program.patient_id, title: program.title, start_date: program.start_date,
      planned_weeks: String(program.planned_weeks), sessions_per_week: String(program.sessions_per_week),
      session_duration_min: program.session_duration_min == null ? '' : String(program.session_duration_min),
      session_duration_max: program.session_duration_max == null ? '' : String(program.session_duration_max),
      clinician_notes: program.clinician_notes ?? ''
    })
    setActivities(((data ?? []) as Item[]).map(toDraft))
    setShowForm(true)
  }

  async function saveProgram(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!supabase || !profile) return
    if (!activities.length) { setError('Add at least one prescribed activity before saving the plan.'); return }
    setSaving(true); setError(''); setNotice('')
    const end = new Date(`${form.start_date}T12:00:00`)
    end.setDate(end.getDate() + Number(form.planned_weeks) * 7 - 1)
    const payload = {
      patient_id: form.patient_id, clinician_id: profile.id, title: form.title, start_date: form.start_date,
      end_date: end.toISOString().slice(0, 10), planned_weeks: Number(form.planned_weeks),
      sessions_per_week: Number(form.sessions_per_week),
      session_duration_min: Number(form.session_duration_min) || null,
      session_duration_max: Number(form.session_duration_max) || null,
      clinician_notes: form.clinician_notes || null
    }
    let programId = editingProgram?.id
    if (editingProgram) {
      const { error: updateError } = await supabase.from('rehab_programs').update(payload).eq('id', editingProgram.id).eq('status', 'draft')
      if (updateError) { setError(updateError.message); setSaving(false); return }
    } else {
      const { data, error: insertError } = await supabase.from('rehab_programs').insert({ ...payload, status: 'draft' }).select('*').single()
      if (insertError || !data) { setError(insertError?.message ?? 'Could not create the draft plan.'); setSaving(false); return }
      programId = data.id
    }
    if (!programId) { setError('The plan could not be identified after saving.'); setSaving(false); return }

    const retainedIds = activities.flatMap((a) => a.id ? [a.id] : [])
    const removedIds = editingProgram ? items.filter((item) => item.program_id === programId && !retainedIds.includes(item.id)).map((item) => item.id) : []
    if (removedIds.length) {
      const { error: deleteError } = await supabase.from('rehab_program_items').delete().in('id', removedIds)
      if (deleteError) { setError(`Plan details saved, but removed activities could not be deleted: ${deleteError.message}`); setSaving(false); await load(); return }
    }
    for (let index = 0; index < activities.length; index++) {
      const activity = activities[index]
      const itemPayload = {
        program_id: programId, library_item_id: activity.library_item_id, exercise_title: activity.exercise_title,
        category: activity.category, instructions: activity.instructions, frequency: activity.frequency || null,
        sets: activity.sets, repetitions: activity.repetitions, duration_minutes: activity.duration_minutes,
        intensity: activity.intensity, rest_seconds: activity.rest_seconds, clinician_notes: activity.clinician_notes,
        sort_order: index
      }
      const result = activity.id
        ? await supabase.from('rehab_program_items').update(itemPayload).eq('id', activity.id)
        : await supabase.from('rehab_program_items').insert(itemPayload)
      if (result.error) {
        setError(`Plan saved, but an activity could not be saved: ${result.error.message}`)
        setSaving(false); await load(); return
      }
    }
    setNotice(editingProgram ? 'Draft plan updated. It is still a draft and is not visible to the patient.' : 'Draft rehabilitation plan created. Review all individualized activity doses before approval.')
    resetEditor()
    await load()
    setSaving(false)
  }

  async function updateProgram(p: Program, status: 'active' | 'on_hold' | 'completed') {
    if (!supabase) return
    setError(''); setNotice('')
    const { error: e } = await supabase.from('rehab_programs').update({
      status, approved_at: status === 'active' ? new Date().toISOString() : p.approved_at
    }).eq('id', p.id)
    if (e) setError(e.message); else { setNotice(`Plan status updated to ${status}.`); await load() }
  }

  async function submitLog(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!supabase || !profile) return
    const p = visiblePrograms.find((x) => x.id === logProgram)
    if (!p) return
    setSaving(true); setError('')
    const patientId = isPatient ? patients[0]?.id : p.patient_id
    if (!patientId) { setError('Patient record could not be identified for this account.'); setSaving(false); return }
    const { error: e2 } = await supabase.from('rehab_session_logs').insert({
      program_id: p.id, patient_id: patientId, completion_status: logStatus,
      completed_minutes: logMinutes ? Number(logMinutes) : null, perceived_difficulty: logDifficulty,
      symptoms: logSymptoms || null, missed_reason: logMissed || null, patient_notes: logNotes || null
    })
    if (e2) setError(e2.message)
    else {
      setNotice(isPatient ? 'تم تسجيل تحديث الجلسة بنجاح.' : 'Session update recorded.')
      setLogProgram(''); setLogMinutes(''); setLogSymptoms(''); setLogMissed(''); setLogNotes('')
      await load()
    }
    setSaving(false)
  }

  const patientText = {
    title: 'خطة التأهيل الخاصة بي', subtitle: 'يمكنك الاطلاع على الخطة المعتمدة من الطبيب وتسجيل نشاطك.',
    clinicalTitle: 'وصفة علاجية فردية', clinicalBody: 'يتم تحديد تفاصيل البرنامج والأنشطة والجرعات لكل مريض بواسطة الطبيب المعالج واعتمادها قبل إتاحتها للمريض.',
    noPlan: 'لا توجد خطة معتمدة حتى الآن', noPlanBody: 'سيتمكن فريقك الطبي من إتاحة الخطة هنا بعد مراجعتها واعتمادها.',
    weeks: 'أسابيع', sessions: 'جلسات أسبوعياً', minutes: 'دقيقة لكل جلسة', activities: 'أنشطة موصوفة',
    sessionLog: 'سجل الجلسات المبلّغ عنها', noUpdates: 'لم يتم تسجيل أي تحديثات للنشاط بعد.',
    record: 'تسجيل تحديث الجلسة', sessionUpdate: 'تسجيل تحديث النشاط', sessionStatus: 'حالة الجلسة',
    completedMinutes: 'عدد الدقائق المنفذة', difficulty: 'مدى صعوبة الجلسة', symptoms: 'أعراض أو شعور بعدم الراحة',
    missed: 'سبب عدم إكمال الجلسة (إن وجد)', extra: 'ملاحظات إضافية',
    easy: 'سهل', manageable: 'مقبول', difficult: 'صعب', veryDifficult: 'صعب جداً',
    completed: 'مكتملة', partial: 'مكتملة جزئياً', notCompleted: 'لم تكتمل',
    symptomsPlaceholder: 'اكتب أي أعراض شعرت بها أثناء الجلسة',
    safety: 'هذا السجل يعتمد على ما تسجله بنفسك ولا يمثل قياساً طبياً للأداء. إذا ظهرت أعراض شديدة أو مقلقة، اتبع خطة التعامل مع الربو الخاصة بك واطلب المساعدة الطبية المناسبة؛ ولا تعتمد على التطبيق في حالات الطوارئ.',
    cancel: 'إلغاء', submit: 'إرسال التحديث', saving: 'جارٍ الحفظ...',
    min: 'دقيقة', sets: 'مجموعات', reps: 'تكرارات', frequency: 'التكرار حسب وصف الطبيب',
    notes: 'ملاحظات الطبيب', status: 'حالة الخطة', from: 'من', to: 'إلى'
  }

  return <div className="content-page" dir={isPatient ? 'rtl' : undefined} lang={isPatient ? 'ar' : undefined}>
    <div className="page-intro-row">
      <div>
        <h2>{isPatient ? patientText.title : 'Rehabilitation plans'}</h2>
        <p>{isPatient ? patientText.subtitle : 'Create individualized plans and review patient-reported activity.'}</p>
      </div>
      {!isPatient && <button className="primary-button" onClick={() => { resetEditor(); setShowForm(true) }} disabled={!patients.length}><Plus size={16}/> Create plan</button>}
    </div>
    <div className="clinical-note"><ShieldAlert size={17}/><div>
      <strong>{isPatient ? patientText.clinicalTitle : 'Individualized clinical prescription'}</strong>
      <span>{isPatient ? patientText.clinicalBody : 'The thesis describes an 8-week program with 3 sessions per week and 90–120 minutes per session. The app uses these as editable planning references only. Aerobic intensity is intentionally not pre-filled because the thesis gives conflicting target ranges. Treating clinicians must determine and approve each patient’s prescription.'}</span>
    </div></div>
    {notice && <div className="success-banner">{notice}</div>}
    {error && <div className="form-error page-error">{error}</div>}
    {loading ? <div className="table-empty">{isPatient ? 'جارٍ تحميل خطة التأهيل...' : 'Loading rehabilitation plans…'}</div>
      : visiblePrograms.length === 0
        ? <div className="empty-state"><ClipboardList size={30}/><strong>{isPatient ? patientText.noPlan : 'No rehabilitation plans created'}</strong><span>{isPatient ? patientText.noPlanBody : 'Create a draft plan for one of your assigned asthma patients.'}</span></div>
        : <div className="program-list">{visiblePrograms.map((p) => <article className="program-card" key={p.id}>
          <div className="program-head"><div>
            <span className="form-kicker">{trStatus(p.status)} · {p.planned_weeks} {isPatient ? patientText.weeks : 'weeks'}</span>
            <h3>{isPatient ? (p.title === 'Bronchial asthma rehabilitation plan' ? 'خطة تأهيل الربو الشعبي' : p.title) : `${patientName(p.patient_id)} · ${p.title}`}</h3>
            <span className="assessment-date"><CalendarDays size={12}/> {p.start_date} {p.end_date ? `— ${p.end_date}` : ''}</span>
          </div><span className={`status-pill ${p.status === 'active' ? 'active' : p.status === 'completed' ? 'pending' : 'inactive'}`}>{trStatus(p.status)}</span></div>
          <div className="program-facts">
            <span>{p.sessions_per_week} {isPatient ? patientText.sessions : 'sessions / week'}</span>
            <span>{p.session_duration_min ?? '—'}–{p.session_duration_max ?? '—'} {isPatient ? patientText.minutes : 'min / session'}</span>
            <span>{programItems(p.id).length} {isPatient ? patientText.activities : 'prescribed activities'}</span>
          </div>
          {p.clinician_notes && <p className="program-notes">{isPatient ? 'ملاحظات الطبيب: ' : ''}{p.clinician_notes}</p>}
          <div className="program-items">{programItems(p.id).map((item) => <div className="program-item" key={item.id}>
            <div><strong>{displayItemTitle(item)}</strong><span>{trCategory(item.category)} · {isPatient && (!item.frequency || item.frequency === 'As prescribed') ? patientText.frequency : (item.frequency || 'Frequency set by clinician')}</span></div>
            <div className="program-dose">
              {item.sets ? `${item.sets} ${isPatient ? patientText.sets : 'sets'}` : ''}
              {item.repetitions ? ` · ${item.repetitions} ${isPatient ? patientText.reps : 'reps'}` : ''}
              {item.duration_minutes ? ` · ${item.duration_minutes} ${isPatient ? patientText.min : 'min'}` : ''}
              {item.intensity ? ` · ${item.intensity}` : ''}
            </div>
            {item.clinician_notes && <p>{item.clinician_notes}</p>}
          </div>)}</div>
          {!isPatient && <div className="program-actions">
            {p.status === 'draft' && <>
              <button className="secondary-button" onClick={() => void openEdit(p)}><Pencil size={14}/> Edit draft</button>
              <button className="primary-button" onClick={() => void updateProgram(p, 'active')}><CheckCircle2 size={15}/> Approve & activate</button>
            </>}
            {p.status === 'active' && <><button className="secondary-button" onClick={() => void updateProgram(p, 'on_hold')}>Put on hold</button><button className="secondary-button" onClick={() => void updateProgram(p, 'completed')}>Mark completed</button></>}
          </div>}
          <div className="session-history"><strong>{isPatient ? patientText.sessionLog : 'Patient-reported session log'}</strong>
            {programLogs(p.id).length === 0 ? <span className="field-note">{isPatient ? patientText.noUpdates : 'No activity updates recorded.'}</span>
              : programLogs(p.id).slice(0, 5).map((l) => <div className="session-row" key={l.id}>
                <span>{l.session_date} · {isPatient ? (completionAr[l.completion_status] ?? l.completion_status) : l.completion_status.replaceAll('_', ' ')}</span>
                <span>{l.completed_minutes ?? '—'} {isPatient ? patientText.min : 'min'} · {isPatient ? (difficultyAr[l.perceived_difficulty ?? ''] ?? 'لم تسجل درجة الصعوبة') : (l.perceived_difficulty ?? 'difficulty not recorded')}</span>
                {l.symptoms && <small>{isPatient ? 'الأعراض:' : 'Symptoms:'} {l.symptoms}</small>}
                {l.missed_reason && <small>{isPatient ? 'سبب عدم الإكمال:' : 'Reason missed:'} {l.missed_reason}</small>}
              </div>)}
          </div>
          {isPatient && <button className="primary-button" onClick={() => setLogProgram(p.id)}><Activity size={15}/> {patientText.record}</button>}
        </article>)}</div>}

    {showForm && <div className="modal-backdrop" onClick={resetEditor}><section className="modal-card program-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header"><div><span className="form-kicker">CLINICIAN WORKSPACE</span><h3>{editingProgram ? 'Edit draft rehabilitation plan' : 'Create rehabilitation plan'}</h3></div>
        <button className="icon-button" onClick={resetEditor}>×</button></div>
      <form className="modal-form program-form" onSubmit={saveProgram}>
        <label className="span-two">Patient<select required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} disabled={!!editingProgram}><option value="">Select patient</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
        <label className="span-two">Plan title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/></label>
        <label>Start date<input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}/></label>
        <label>Duration (weeks)<input type="number" min="1" max="52" value={form.planned_weeks} onChange={(e) => setForm({ ...form, planned_weeks: e.target.value })}/></label>
        <label>Sessions per week<input type="number" min="1" max="7" value={form.sessions_per_week} onChange={(e) => setForm({ ...form, sessions_per_week: e.target.value })}/></label>
        <label>Session duration min (minutes)<input type="number" min="1" value={form.session_duration_min} onChange={(e) => setForm({ ...form, session_duration_min: e.target.value })}/></label>
        <label>Session duration max (minutes)<input type="number" min="1" value={form.session_duration_max} onChange={(e) => setForm({ ...form, session_duration_max: e.target.value })}/></label>
        <div className="form-section-label">Prescribed activities — edit existing doses or add another activity</div>
        {activities.length > 0 && <div className="span-two draft-activity-list">{activities.map((a, index) => <div key={a.id ?? `${a.library_item_id}-${index}`}>
          <span><strong>{a.exercise_title}</strong><small>{a.frequency}{a.sets ? ` · ${a.sets} sets` : ''}{a.repetitions ? ` · ${a.repetitions} reps` : ''}{a.duration_minutes ? ` · ${a.duration_minutes} min` : ''}{a.intensity ? ` · ${a.intensity}` : ''}</small></span>
          <span className="draft-activity-controls">
            <button type="button" className="text-button" onClick={() => startEditActivity(index)}><Pencil size={13}/> Edit</button>
            <button type="button" className="text-button" onClick={() => { setActivities((old) => old.filter((_, i) => i !== index)); if (editingActivityIndex === index) { setEditingActivityIndex(null); setSelectedExercise('') } }}><Trash2 size={13}/> Remove</button>
          </span>
        </div>)}</div>}
        <label className="span-two">Exercise / education<select value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)}><option value="">Choose from library</option>{library.map((l) => <option key={l.id} value={l.id}>{l.title} · {l.category}</option>)}</select></label>
        <label>Frequency<input value={itemFrequency} onChange={(e) => setItemFrequency(e.target.value)} placeholder="e.g. 3 days/week"/></label>
        <label>Sets<input type="number" min="1" value={itemSets} onChange={(e) => setItemSets(e.target.value)}/></label>
        <label>Repetitions<input type="number" min="1" value={itemReps} onChange={(e) => setItemReps(e.target.value)}/></label>
        <label>Duration (minutes)<input type="number" min="0" step="0.5" value={itemDuration} onChange={(e) => setItemDuration(e.target.value)}/></label>
        <label className="span-two">Intensity / target (clinician-entered)<input value={itemIntensity} onChange={(e) => setItemIntensity(e.target.value)} placeholder="Leave blank until individually determined"/></label>
        <label className="span-two">Activity-specific notes<textarea rows={2} value={itemNotes} onChange={(e) => setItemNotes(e.target.value)}/></label>
        <div className="span-two activity-add-row"><button type="button" className="secondary-button" onClick={addActivity}><Plus size={14}/> {editingActivityIndex === null ? 'Add activity' : 'Update activity'}</button><span>{activities.length} activities in this plan</span>{editingActivityIndex !== null && <button type="button" className="text-button" onClick={() => { setEditingActivityIndex(null); setSelectedExercise(''); setItemFrequency('As prescribed'); setItemSets(''); setItemReps(''); setItemDuration(''); setItemIntensity(''); setItemNotes('') }}>Cancel activity edit</button>}</div>
        <label className="span-two">Clinical plan notes<textarea rows={3} value={form.clinician_notes} onChange={(e) => setForm({ ...form, clinician_notes: e.target.value })}/></label>
        <p className="field-note span-two">Save changes to keep this plan as a draft. The patient will not see it until you explicitly approve and activate it.</p>
        <div className="modal-actions span-two"><button type="button" className="secondary-button" onClick={resetEditor}>Cancel</button><button className="primary-button" disabled={saving}><Save size={15}/>{saving ? 'Saving…' : editingProgram ? 'Save draft changes' : 'Save draft plan'}</button></div>
      </form>
    </section></div>}

    {logProgram && <div className="modal-backdrop" onClick={() => setLogProgram('')}><section className="modal-card" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header"><div><span className="form-kicker">{isPatient ? 'تسجيل المريض' : 'PATIENT SELF-REPORT'}</span><h3>{isPatient ? patientText.sessionUpdate : 'Record activity update'}</h3></div><button className="icon-button" onClick={() => setLogProgram('')}>×</button></div>
      <form className="modal-form" onSubmit={submitLog}>
        <label>{isPatient ? patientText.sessionStatus : 'Session status'}<select value={logStatus} onChange={(e) => setLogStatus(e.target.value)}>
          <option value="completed">{isPatient ? patientText.completed : 'Completed'}</option>
          <option value="partially_completed">{isPatient ? patientText.partial : 'Partially completed'}</option>
          <option value="not_completed">{isPatient ? patientText.notCompleted : 'Not completed'}</option>
        </select></label>
        <label>{isPatient ? patientText.completedMinutes : 'Minutes completed'}<input type="number" min="0" step="1" value={logMinutes} onChange={(e) => setLogMinutes(e.target.value)}/></label>
        <label>{isPatient ? patientText.difficulty : 'Perceived difficulty'}<select value={logDifficulty} onChange={(e) => setLogDifficulty(e.target.value)}>
          <option value="easy">{isPatient ? patientText.easy : 'Easy'}</option><option value="manageable">{isPatient ? patientText.manageable : 'Manageable'}</option>
          <option value="difficult">{isPatient ? patientText.difficult : 'Difficult'}</option><option value="very_difficult">{isPatient ? patientText.veryDifficult : 'Very difficult'}</option>
        </select></label>
        <label>{isPatient ? patientText.symptoms : 'Symptoms or discomfort'}<textarea rows={2} value={logSymptoms} onChange={(e) => setLogSymptoms(e.target.value)} placeholder={isPatient ? patientText.symptomsPlaceholder : 'Describe any symptoms experienced'}/></label>
        <label>{isPatient ? patientText.missed : 'Reason not completed (if applicable)'}<textarea rows={2} value={logMissed} onChange={(e) => setLogMissed(e.target.value)}/></label>
        <label>{isPatient ? patientText.extra : 'Additional notes'}<textarea rows={2} value={logNotes} onChange={(e) => setLogNotes(e.target.value)}/></label>
        <p className="field-note">{isPatient ? patientText.safety : 'This is self-reported activity, not a measurement of exercise performance. If you experience severe or concerning symptoms, follow your asthma action plan and seek appropriate medical help rather than relying on this form.'}</p>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setLogProgram('')}>{isPatient ? patientText.cancel : 'Cancel'}</button><button className="primary-button" disabled={saving}>{saving ? (isPatient ? patientText.saving : 'Saving…') : isPatient ? patientText.submit : 'Submit update'}</button></div>
      </form>
    </section></div>}
  </div>
}
