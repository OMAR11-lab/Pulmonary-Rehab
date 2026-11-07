import { useState } from 'react'
import type { FormEvent } from 'react'
import { LockKeyhole, Wind } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export function SetPasswordPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  if (!loading && !user) return <div className="screen-loader"><div className="notice-card"><strong>Invitation link not active</strong><p>Open the latest invitation email link again. If it has expired, ask the administrator to send a new invitation.</p><Link to="/login">Return to sign in</Link></div></div>
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    if (password.length < 10) { setError('Use at least 10 characters.'); return }
    if (password !== confirm) { setError('The passwords do not match.'); return }
    if (!supabase) return
    setBusy(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) setError(updateError.message)
    else { setSuccess(true); window.setTimeout(() => navigate('/', { replace: true }), 1200) }
    setBusy(false)
  }
  return <div className="password-page"><div className="password-card"><div className="mobile-brand"><div className="brand-mark"><Wind size={20} /></div><strong>Respira</strong></div><div className="form-kicker">ACCOUNT ACTIVATION</div><h1>Set your password</h1><p className="muted">Create a secure password to activate your Respira workspace.</p><form className="login-form" onSubmit={submit}><label>New password</label><div className="input-wrap"><LockKeyhole size={17} /><input type="password" minLength={10} required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 10 characters" /></div><label>Confirm password</label><div className="input-wrap"><LockKeyhole size={17} /><input type="password" required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Enter password again" /></div>{error && <div className="form-error">{error}</div>}{success && <div className="success-banner">Password set successfully. Opening your workspace…</div>}<button className="primary-button full" disabled={busy || success}>{busy ? 'Saving…' : 'Set password'}</button></form></div></div>
}
