import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Search, UserPlus, Users, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { AppRole, Profile } from '../types/database'

export function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', role: 'pulmonologist' as Exclude<AppRole, 'patient'> })
  const [message, setMessage] = useState('')

  async function loadUsers() {
    if (!supabase) return
    setLoading(true); setError('')
    const { data, error: loadError } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (loadError) setError(loadError.message)
    else setUsers((data ?? []) as Profile[])
    setLoading(false)
  }
  useEffect(() => { void loadUsers() }, [])

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase) return
    setSaving(true); setError(''); setMessage('')
    const { data, error: invokeError } = await supabase.functions.invoke('admin-create-user', { body: form })
    if (invokeError) setError(invokeError.message)
    else if (data?.error) setError(String(data.error))
    else { setMessage('Account created successfully.'); setShowForm(false); setForm({ full_name: '', email: '', phone: '', role: 'pulmonologist' }); await loadUsers() }
    setSaving(false)
  }
  const filtered = users.filter(user => `${user.full_name} ${user.email ?? ''} ${user.role}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="content-page"><div className="page-intro-row"><div><h2>Platform accounts</h2><p>Create and manage administrator and pulmonologist accounts. Patient access is activated from an assigned patient record.</p></div><button className="primary-button" onClick={() => setShowForm(true)}><UserPlus size={17} /> Create account</button></div>
    {message && <div className="success-banner">{message}</div>}{error && <div className="form-error page-error">{error}</div>}
    <div className="toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, email or role" /></div><span className="result-count"><Users size={16} /> {filtered.length} accounts</span></div>
    <div className="table-card"><div className="table-scroll"><table><thead><tr><th>ACCOUNT</th><th>ROLE</th><th>PHONE</th><th>STATUS</th><th>CREATED</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="table-empty">Loading accounts…</td></tr> : filtered.length === 0 ? <tr><td colSpan={5} className="table-empty">No accounts found.</td></tr> : filtered.map(user => <tr key={user.id}><td><div className="user-cell"><div className="avatar table-avatar">{user.full_name.slice(0, 1).toUpperCase()}</div><div><strong>{user.full_name}</strong><span>{user.email || 'No email'}</span></div></div></td><td><span className={`role-tag ${user.role}`}>{user.role}</span></td><td>{user.phone || '—'}</td><td><span className={`status-pill ${user.is_active ? 'active' : 'inactive'}`}>{user.is_active ? 'Active' : 'Inactive'}</span></td><td>{new Date(user.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div></div>
    {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><section className="modal-card" onClick={e => e.stopPropagation()}><div className="modal-header"><div><span className="form-kicker">NEW PLATFORM USER</span><h3>Create account</h3></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Close"><X size={18} /></button></div><form onSubmit={createUser} className="modal-form"><label>Full name<input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Full name" /></label><label>Email address<input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" /></label><label>Phone number<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Optional" /></label><label>Account role<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Exclude<AppRole, 'patient'> })}><option value="pulmonologist">Pulmonologist</option><option value="admin">Administrator</option></select></label><p className="field-note">An invitation email will be sent so the user can set their own password. The service-role key is never exposed to the browser.</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Creating…' : 'Create account'}</button></div></form></section></div>}
  </div>
}
