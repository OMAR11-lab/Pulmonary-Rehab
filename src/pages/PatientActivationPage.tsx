import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { LockKeyhole, Wind } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export function PatientActivationPage() {
  const navigate = useNavigate(); const [params] = useSearchParams(); const token = params.get('token') ?? ''
  const { user, profile, loading } = useAuth()
  const [phone, setPhone] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  if (!loading && user && profile?.is_active && !token) return <Navigate to="/" replace />
  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase) return
    setError(''); setNotice('')
    if (password.length < 10) { setError('يجب ألا تقل كلمة المرور عن 10 أحرف.'); return }
    if (password !== confirm) { setError('كلمتا المرور غير متطابقتين.'); return }
    setBusy(true)
    const { data, error: activationError } = await supabase.functions.invoke('activate-patient-account', { body: { token, phone: phone.trim(), password } })
    if (activationError || data?.error) { setError(data?.error || activationError?.message || 'تعذر تفعيل الحساب.'); setBusy(false); return }
    const { error: signInError } = await supabase.auth.signInWithPassword({ phone: phone.trim(), password })
    if (signInError) { setNotice('تم إنشاء حسابك. يمكنك الآن الدخول من بوابة المريض باستخدام الرابط الثابت التالي:'); setBusy(false); return }
    setNotice('تم تفعيل حسابك بنجاح. جارٍ فتح بوابة المريض…'); setBusy(false); window.setTimeout(() => navigate('/', { replace: true }), 700)
  }
  return <div className="password-page patient-arabic" dir="rtl" lang="ar"><section className="password-card"><div className="mobile-brand"><div className="brand-mark"><Wind size={20}/></div><strong>Respira</strong></div><div className="form-kicker">تفعيل حساب المريض</div><h1>تأكيد رقم الهاتف وتفعيل الحساب</h1><p className="muted">أدخل رقم الهاتف نفسه الذي سجّله الطبيب في ملفك. تتم مطابقة الرقم مع بيانات العيادة فقط، ولن تُرسل أي رسالة نصية أو رمز تحقق. أنشئ كلمة مرور لاستخدام حسابك.</p>
    {!token && <div className="form-error">رابط التفعيل غير مكتمل. يُرجى طلب رابط جديد من العيادة.</div>}{notice && <div className="success-banner">{notice}<br/><Link to="/patient-login">https://pulmonary-rehab.vercel.app/patient-login</Link></div>}{error && <div className="form-error">{error}</div>}
    <form className="login-form" onSubmit={activate}><label>رقم الهاتف المسجل لدى الطبيب</label><div className="input-wrap"><LockKeyhole size={16}/><input required type="tel" dir="ltr" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+20…" autoComplete="tel"/></div><label>إنشاء كلمة مرور</label><div className="input-wrap"><LockKeyhole size={16}/><input required type="password" minLength={10} value={password} onChange={e=>setPassword(e.target.value)} placeholder="10 أحرف على الأقل" autoComplete="new-password"/></div><label>تأكيد كلمة المرور</label><div className="input-wrap"><LockKeyhole size={16}/><input required type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="أعد إدخال كلمة المرور" autoComplete="new-password"/></div><button className="primary-button full" disabled={busy||!token||!supabase}>{busy?'جارٍ تفعيل الحساب…':'تأكيد الرقم وتفعيل الحساب'}</button></form>
    <p className="login-footnote">إذا لم يتطابق الرقم، تواصل مع العيادة لتحديث بياناتك. <br/><Link to="/patient-login">الانتقال إلى بوابة المريض</Link></p><p className="login-footnote">هذه البوابة لا تغني عن علاج الربو الموصوف أو طلب الرعاية الطبية الطارئة.</p>
  </section></div>
}
