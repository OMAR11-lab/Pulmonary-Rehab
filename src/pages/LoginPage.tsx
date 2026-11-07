import { useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, ArrowRight, LockKeyhole, Mail, Wind } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'

export function LoginPage() {
  const { user, profile, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!loading && user && profile?.is_active) return <Navigate to={profile.role === 'patient' ? '/' : '/'} replace />
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true)
    try { await signIn(email.trim(), password) } catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in.') } finally { setBusy(false) }
  }
  return <div className="login-page"><section className="login-visual"><div className="login-brand"><div className="brand-mark"><Wind size={23}/></div><div><strong>Respira</strong><span>ASTHMA REHABILITATION</span></div></div><div className="visual-copy"><div className="visual-kicker"><Activity size={15}/> CLINICIAN-LED CARE</div><h1>Better breathing.<br/><em>Stronger living.</em></h1><p>A connected space for bronchial asthma rehabilitation, guided exercise and measurable progress.</p></div><div className="visual-bottom"><span>ASSESS</span><b>·</b><span>PLAN</span><b>·</b><span>MONITOR</span><b>·</b><span>IMPROVE</span></div><div className="orb orb-one"/><div className="orb orb-two"/></section>
  <section className="login-panel"><div className="login-form-wrap"><div className="mobile-brand"><div className="brand-mark"><Wind size={20}/></div><strong>Respira</strong></div><div className="form-kicker">STAFF ACCESS</div><h2>Sign in to the clinical workspace</h2><p className="muted">For administrators and pulmonary rehabilitation clinicians. Patients should use the dedicated patient portal.</p>
  {!isSupabaseConfigured&&<div className="config-warning"><strong>Setup required</strong><span>Connect your Supabase project by adding the environment variables from <code>.env.example</code>.</span></div>}
  <form onSubmit={submit} className="login-form"><label>Email address</label><div className="input-wrap"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@hospital.com" required autoComplete="username"/></div><label>Password</label><div className="input-wrap"><LockKeyhole size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password"/></div>{error&&<div className="form-error">{error}</div>}<button className="primary-button full" disabled={busy||!isSupabaseConfigured}>{busy?'Signing in…':'Staff sign in'}<ArrowRight size={17}/></button></form>
  <div className="login-security"><LockKeyhole size={15}/><span>Secure access for authorized clinical staff.</span></div><p className="login-footnote">Are you a patient? <a href="/patient-login">افتح بوابة المريض</a></p></div></section></div>
}
