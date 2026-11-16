import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { LockKeyhole, Phone, Wind } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export function PatientActivationPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { user, profile, loading } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  if (!loading && user && profile?.is_active && !token) return <Navigate to={profile.role === 'patient' ? '/patient-portal' : '/dashboard'} replace />

  async function activate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!supabase) return
    setError(''); setNotice('')
    if (!token) { setError('رابط التفعيل غير مكتمل. اطلب من العيادة إنشاء رابط جديد.'); return }
    if (password.length < 10) { setError('يجب ألا تقل كلمة المرور عن 10 أحرف.'); return }
    if (password !== confirm) { setError('كلمتا المرور غير متطابقتين.'); return }
    setBusy(true)
    const { data, error: activationError } = await supabase.functions.invoke('activate-patient-account', { body: { token, phone: phone.trim(), password } })
    if (activationError || data?.error) {
      let detail = data?.error || activationError?.message || 'تعذر تفعيل الحساب.'
      try {
        const response = (activationError as { context?: Response } | null)?.context
        if (response) {
          const body = await response.clone().json()
          if (body?.error) detail = body.error
        }
      } catch { /* retain the readable function error */ }
      setError(detail); setBusy(false); return
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ phone: phone.trim(), password })
    if (signInError) {
      setNotice('تم إنشاء الحساب. يمكنك الآن تسجيل الدخول من بوابة المريض باستخدام رقم الهاتف وكلمة المرور.')
      setBusy(false); return
    }
    setNotice('تم تفعيل الحساب بنجاح. جارٍ فتح بوابة المريض…')
    setBusy(false)
    window.setTimeout(() => navigate('/patient-portal', { replace: true }), 700)
  }

  return <main className="patient-ar-page" dir="rtl" lang="ar">
    <section className="patient-ar-card">
      <div className="patient-ar-brand"><span><Wind size={22}/></span><div><strong>Respira</strong><small>برنامج التأهيل التنفسي</small></div></div>
      <div className="form-kicker">تفعيل حساب المريض</div>
      <h1>تأكيد رقم الهاتف</h1>
      <p className="patient-ar-muted">أدخل رقم الهاتف نفسه الذي سجّله الطبيب في ملفك. تتم مطابقة الرقم مع سجل العيادة فقط؛ لن تُرسل رسالة نصية أو رمز تحقق. أنشئ كلمة مرور للدخول إلى حسابك.</p>
      {!token && <div className="form-error">رابط التفعيل غير صالح أو لا يحتوي على رمز. تواصل مع العيادة للحصول على رابط جديد.</div>}
      {notice && <div className="success-banner">{notice}</div>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <form className="login-form" onSubmit={activate}>
        <label>رقم الهاتف المسجل لدى الطبيب</label>
        <div className="input-wrap"><Phone size={16}/><input required type="tel" dir="ltr" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+20…" autoComplete="tel"/></div>
        <label>إنشاء كلمة مرور</label>
        <div className="input-wrap"><LockKeyhole size={16}/><input required type="password" minLength={10} value={password} onChange={e=>setPassword(e.target.value)} placeholder="10 أحرف على الأقل" autoComplete="new-password"/></div>
        <label>تأكيد كلمة المرور</label>
        <div className="input-wrap"><LockKeyhole size={16}/><input required type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="أعد إدخال كلمة المرور" autoComplete="new-password"/></div>
        <button className="primary-button full" disabled={busy || !token || !supabase}>{busy ? 'جارٍ تفعيل الحساب…' : 'تأكيد الرقم وتفعيل الحساب'}</button>
      </form>
      <p className="patient-ar-foot">إذا لم يتطابق الرقم مع ملف المريض، يرجى التواصل مع العيادة.</p>
      <Link className="patient-ar-staff-link" to="/patient-login">الانتقال إلى تسجيل دخول المريض</Link>
    </section>
  </main>
}
