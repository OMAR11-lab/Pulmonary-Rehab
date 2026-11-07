import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { LockKeyhole, Wind } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function PatientLoginPage() {
  const { user, profile, loading } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!loading && user && profile?.is_active) return <Navigate to="/" replace />
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setError(''); setBusy(true)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ phone: phone.trim(), password })
    if (signInError) { setError('تعذر تسجيل الدخول. تأكد من رقم الهاتف وكلمة المرور أو تواصل مع العيادة.'); setBusy(false); return }
    const { data: profileData, error: profileError } = await supabase.from('profiles').select('role,is_active').eq('id', data.user.id).maybeSingle()
    if (profileError || !profileData?.is_active || profileData.role !== 'patient') {
      await supabase.auth.signOut()
      setError('هذا الحساب غير مخصص لبوابة المرضى. يُرجى استخدام بوابة الموظفين إذا كنت من فريق العمل.')
    }
    setBusy(false)
  }
  return <div className="password-page patient-arabic" dir="rtl" lang="ar"><section className="password-card patient-login-card"><div className="mobile-brand"><div className="brand-mark"><Wind size={20}/></div><strong>Respira</strong></div><div className="form-kicker">بوابة المريض</div><h1>مرحباً بك في برنامج التأهيل التنفسي</h1><p className="muted">سجّل الدخول باستخدام رقم الهاتف المسجل لدى العيادة وكلمة المرور التي أنشأتها عند تفعيل حسابك.</p>
    {!isSupabaseConfigured && <div className="form-error">بوابة المريض غير متصلة حالياً. يُرجى التواصل مع العيادة.</div>}
    <form className="login-form" onSubmit={submit}><label>رقم الهاتف المسجل</label><div className="input-wrap"><LockKeyhole size={16}/><input required type="tel" dir="ltr" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+20…" autoComplete="tel"/></div><label>كلمة المرور</label><div className="input-wrap"><LockKeyhole size={16}/><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="أدخل كلمة المرور" autoComplete="current-password"/></div>{error&&<div className="form-error">{error}</div>}<button className="primary-button full" disabled={busy||!isSupabaseConfigured}>{busy?'جارٍ تسجيل الدخول…':'تسجيل الدخول'}</button></form>
    <p className="login-footnote">ليس لديك حساب مفعّل؟ استخدم رابط التفعيل الذي أرسلته لك العيادة. <br/><Link to="/login">بوابة الموظفين</Link></p><p className="login-footnote">لا تستبدل هذه البوابة العلاج الموصوف أو الرعاية الطبية الطارئة.</p>
  </section></div>
}
