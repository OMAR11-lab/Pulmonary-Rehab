import { Link } from 'react-router-dom'
import { ClipboardList, LogOut, Wind } from 'lucide-react'
import { useAuth } from '../lib/auth'

export function PatientPortalPage() {
  const { profile, signOut } = useAuth()
  return <main className="patient-ar-page" dir="rtl" lang="ar">
    <header className="patient-ar-top">
      <div className="patient-ar-brand"><span><Wind size={22}/></span><div><strong>Respira</strong><small>برنامج التأهيل التنفسي</small></div></div>
      <button className="secondary-button" onClick={() => void signOut()}><LogOut size={15}/> تسجيل الخروج</button>
    </header>
    <section className="patient-ar-card patient-ar-wide">
      <div className="form-kicker">بوابة المريض</div>
      <h1>مرحباً {profile?.full_name || 'بك'}</h1>
      <p className="patient-ar-muted">يمكنك من هنا متابعة خطة التأهيل التي أعدّها واعتمدها فريقك الطبي.</p>
      <article className="patient-ar-feature">
        <span className="patient-ar-feature-icon"><ClipboardList size={23}/></span>
        <h2>خطة التأهيل الخاصة بي</h2>
        <p>اعرض الأنشطة والتعليمات المعتمدة من الطبيب وسجّل تحديثات جلساتك.</p>
        <Link className="primary-button" to="/patient-portal/programs">عرض خطة التأهيل</Link>
      </article>
      <p className="patient-ar-foot">إذا لم تظهر خطة التأهيل، يرجى التواصل مع الطبيب المعالج. لا تغيّر الأدوية أو شدة التمارين دون الرجوع إلى الفريق الطبي.</p>
    </section>
  </main>
}
