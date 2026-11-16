import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { LockKeyhole, Phone, Wind } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export function PatientLoginPage() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!loading && user && profile?.is_active) {
    return <Navigate to={profile.role === 'patient' ? '/patient-portal' : '/dashboard'} replace />
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) { setError('الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً.'); return }
    setBusy(true); setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ phone: phone.trim(), password })
    if (signInError) setError('تعذر تسجيل الدخول. تأكد من رقم الهاتف وكلمة المرور، أو تواصل مع العيادة.')
    else navigate('/patient-portal', { replace: true })
    setBusy(false)
  }

  return <main className="patient-ar-page" dir="rtl" lang="ar">
    <section className="patient-ar-card">
      <div className="patient-ar-brand"><span><Wind size={22}/></span><div><strong>Respira</strong><small>برنامج التأهيل التنفسي</small></div></div>
      <div className="form-kicker">بوابة المريض</div>
      <h1>تسجيل دخول المريض</h1>
      <p className="patient-ar-muted">استخدم رقم الهاتف المسجل لدى الطبيب وكلمة المرور التي أنشأتها عند تفعيل حسابك.</p>
      {error && <div className="form-error" role="alert">{error}</div>}
      <form className="login-form" onSubmit={submit}>
        <label>رقم الهاتف المسجل</label>
        <div className="input-wrap"><Phone size={17}/><input type="tel" dir="ltr" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+20…" required autoComplete="tel"/></div>
        <label>كلمة المرور</label>
        <div className="input-wrap"><LockKeyhole size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="أدخل كلمة المرور" required autoComplete="current-password"/></div>
        <button className="primary-button full" disabled={busy || !supabase}>{busy ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول'}</button>
      </form>
      <p className="patient-ar-foot">ليس لديك حساب مفعّل؟ افتح رابط التفعيل الذي أرسلته لك العيادة.</p>
      <Link className="patient-ar-staff-link" to="/login">دخول فريق العمل</Link>
      <p className="patient-ar-foot">هذه البوابة لا تستبدل العلاج الموصوف أو خطة التعامل مع نوبات الربو أو الرعاية الطبية الطارئة.</p>
    </section>
  </main>
}
