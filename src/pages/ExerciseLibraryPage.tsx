import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, BookOpen, CheckCircle2, Clock3, ShieldAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

type Category = 'all' | 'aerobic' | 'resistance' | 'breathing' | 'flexibility' | 'education' | 'specialist_airway_clearance'
type LibraryItem = { id: string; slug: string; title: string; category: Exclude<Category,'all'>; summary: string; instructions: string; media_url: string | null; media_label: string | null; suggested_dose: string | null; safety_note: string | null; evidence_note: string | null; clinician_supervision_required: boolean; active: boolean; approved: boolean; version: number }
const categories: { value: Category; label: string }[] = [{value:'all',label:'All resources'},{value:'aerobic',label:'Aerobic'},{value:'resistance',label:'Resistance'},{value:'breathing',label:'Breathing'},{value:'flexibility',label:'Flexibility'},{value:'education',label:'Education'},{value:'specialist_airway_clearance',label:'Specialist airway clearance'}]
export function ExerciseLibraryPage() {
  const { profile } = useAuth()
  const [items,setItems] = useState<LibraryItem[]>([])
  const [category,setCategory] = useState<Category>('all')
  const [query,setQuery] = useState('')
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [editing,setEditing] = useState<LibraryItem|null>(null)
  const [editForm,setEditForm] = useState({summary:'',instructions:'',media_url:'',media_label:'',suggested_dose:'',safety_note:''})
  const [saving,setSaving] = useState(false)
  const canApprove = profile?.role === 'admin' || profile?.role === 'pulmonologist'
  async function load() {
    if (!supabase) return
    setLoading(true)
    const {data,error:loadError} = await supabase.from('rehab_library_items').select('*').eq('active',true).order('category').order('title')
    if (loadError) setError(loadError.message); else setItems((data ?? []) as LibraryItem[])
    setLoading(false)
  }
  useEffect(()=>{void load()},[])
  const visible = useMemo(()=>items.filter(item=>(category==='all'||item.category===category)&&`${item.title} ${item.summary} ${item.instructions}`.toLowerCase().includes(query.toLowerCase())),[items,category,query])
  function openEdit(item:LibraryItem){setEditing(item);setEditForm({summary:item.summary,instructions:item.instructions,media_url:item.media_url??'',media_label:item.media_label??'',suggested_dose:item.suggested_dose??'',safety_note:item.safety_note??''})}
  async function saveEdit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!supabase||!editing)return;setSaving(true);setError('');const {error:e1}=await supabase.from('rehab_library_items').update({...editForm,media_url:editForm.media_url.trim()||null,media_label:editForm.media_label.trim()||null,suggested_dose:editForm.suggested_dose.trim()||null,safety_note:editForm.safety_note.trim()||null,approved:false,version:editing.version+1,updated_by:profile?.id}).eq('id',editing.id);if(e1)setError(e1.message);else{setNotice('Content updated and moved back to review. Re-approve it before patient use.');setEditing(null);await load()}setSaving(false)}
  async function toggleApproval(item: LibraryItem) {
    if (!supabase || !canApprove) return
    setError('');setNotice('')
    const {error:updateError}=await supabase.from('rehab_library_items').update({approved:!item.approved,version:item.version+1,updated_by:profile?.id}).eq('id',item.id)
    if(updateError)setError(updateError.message);else{setNotice(`${item.title} ${item.approved?'removed from':'approved for'} patient-facing library.`);await load()}
  }
  return <div className="content-page">
    <div className="page-intro-row"><div><h2>Exercise and education library</h2><p>Thesis-aligned resources for bronchial asthma rehabilitation.</p></div><span className="library-count"><BookOpen size={15}/>{items.length} resources</span></div>
    <div className="clinical-note"><ShieldAlert size={17}/><div><strong>Clinician-controlled content</strong><span>Library entries are reference material, not an individual prescription. Patient accounts only see items approved by the clinical team. Exercise dose and intensity must be set in the patient’s plan.</span></div></div>
    {notice&&<div className="success-banner">{notice}</div>}{error&&<div className="form-error page-error">{error}</div>}
    <div className="library-toolbar"><div className="search-box"><BookOpen size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search exercises and education"/></div><select value={category} onChange={e=>setCategory(e.target.value as Category)}>{categories.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
    {loading?<div className="table-empty">Loading library…</div>:<div className="library-grid">{visible.map(item=><article className="library-card" key={item.id}><div className="library-card-top"><span className={`library-category ${item.category}`}>{item.category.replaceAll('_',' ')}</span>{item.approved?<span className="approval-label"><CheckCircle2 size={13}/>Patient approved</span>:canApprove?<span className="pending-label">Draft / review</span>:null}</div><h3>{item.title}</h3><p>{item.summary}</p><div className="library-instructions">{item.instructions}</div>{item.media_url&&<a className="library-media-link" href={item.media_url} target="_blank" rel="noreferrer">{item.media_label||'Open demonstration media'}</a>}{item.suggested_dose&&<div className="dose-note"><Clock3 size={14}/><span>{item.suggested_dose}</span></div>}{item.safety_note&&<div className="safety-note"><ShieldAlert size={14}/><span>{item.safety_note}</span></div>}{item.evidence_note&&<small className="evidence-note">{item.evidence_note}</small>}{item.clinician_supervision_required&&<div className="supervision-tag"><Activity size={13}/>Clinician supervision required</div>}{canApprove&&<div className="library-card-actions"><button className="secondary-button" onClick={()=>openEdit(item)}>Edit content</button><button className={item.approved?'secondary-button':'primary-button'} onClick={()=>void toggleApproval(item)}>{item.approved?'Unapprove for patients':'Approve for patients'}</button></div>}</article>)}</div>}
    {editing&&<div className="modal-backdrop" onClick={()=>setEditing(null)}><section className="modal-card" onClick={e=>e.stopPropagation()}><div className="modal-header"><div><span className="form-kicker">LIBRARY CONTENT REVIEW</span><h3>{editing.title}</h3></div><button className="icon-button" onClick={()=>setEditing(null)}>×</button></div><form className="modal-form" onSubmit={saveEdit}><label>Summary<textarea rows={2} value={editForm.summary} onChange={e=>setEditForm({...editForm,summary:e.target.value})}/></label><label>Instructions<textarea rows={4} required value={editForm.instructions} onChange={e=>setEditForm({...editForm,instructions:e.target.value})}/></label><label>Suggested dose / source-derived guidance<textarea rows={2} value={editForm.suggested_dose} onChange={e=>setEditForm({...editForm,suggested_dose:e.target.value})}/></label><label>Safety note<textarea rows={2} value={editForm.safety_note} onChange={e=>setEditForm({...editForm,safety_note:e.target.value})}/></label><label>Demonstration media URL (HTTPS)<input type="url" value={editForm.media_url} onChange={e=>setEditForm({...editForm,media_url:e.target.value})} placeholder="https://…"/></label><label>Media label<input value={editForm.media_label} onChange={e=>setEditForm({...editForm,media_label:e.target.value})}/></label><p className="field-note">Saving changes increments the content version and automatically removes patient approval until it is reviewed again.</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setEditing(null)}>Cancel</button><button className="primary-button" disabled={saving}>{saving?'Saving…':'Save and return to review'}</button></div></form></section></div>}
    {!loading&&visible.length===0&&<div className="empty-state"><BookOpen size={28}/><strong>No matching resources</strong><span>Try another category or search term.</span></div>}
  </div>
}
