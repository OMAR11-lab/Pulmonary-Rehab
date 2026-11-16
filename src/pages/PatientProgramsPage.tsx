import { Link } from 'react-router-dom'
import { ArrowRight, LogOut } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { ProgramsPage } from './ProgramsPage'

export function PatientProgramsPage() {
  const { signOut } = useAuth()
  return <main className="patient-ar-page" dir="rtl" lang="ar">
    <header className="patient-ar-top">
      <Link to="/patient-portal" className="patient-ar-back"><ArrowRight size={16}/> العودة إلى بوابة المريض</Link>
      <button className="secondary-button" onClick={() => void signOut()}><LogOut size={15}/> تسجيل الخروج</button>
    </header>
    <section className="patient-ar-card patient-ar-wide">
      <div className="form-kicker">بوابة المريض</div>
      <h1>خطة التأهيل الخاصة بي</h1>
      <ProgramsPage />
    </section>
  </main>
}
