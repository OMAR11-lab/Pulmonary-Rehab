import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { PatientActivationPage } from './pages/PatientActivationPage'
import { PatientLoginPage } from './pages/PatientLoginPage'
import { PatientPortalPage } from './pages/PatientPortalPage'
import { PatientProgramsPage } from './pages/PatientProgramsPage'
import { SetPasswordPage } from './pages/SetPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { UsersPage } from './pages/UsersPage'
import { PatientsPage } from './pages/PatientsPage'
import { AssessmentsPage } from './pages/AssessmentsPage'
import { ExerciseLibraryPage } from './pages/ExerciseLibraryPage'
import { ProgramsPage } from './pages/ProgramsPage'
import { FollowUpPage } from './pages/FollowUpPage'
import { ReportsPage } from './pages/ReportsPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import './styles.css'

function HomeRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="screen-loader"><span className="loader" />Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (profile?.role === 'patient') return <Navigate to="/patient-portal" replace />
  if (profile?.role === 'admin' || profile?.role === 'pulmonologist') return <Navigate to="/dashboard" replace />
  return <div className="screen-loader">Account access unavailable. Contact your clinic.</div>
}

export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/" element={<HomeRedirect />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/set-password" element={<SetPasswordPage />} />
    <Route path="/patient-login" element={<PatientLoginPage />} />
    <Route path="/patient-activate" element={<PatientActivationPage />} />

    <Route element={<ProtectedRoute roles={['patient']} />}>
      <Route path="/patient-portal" element={<PatientPortalPage />} />
      <Route path="/patient-portal/programs" element={<PatientProgramsPage />} />
    </Route>

    <Route element={<ProtectedRoute roles={['admin', 'pulmonologist']} />}>
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/users" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
        <Route path="/patients" element={<ProtectedRoute roles={['pulmonologist']}><PatientsPage /></ProtectedRoute>} />
        <Route path="/assessments" element={<ProtectedRoute roles={['pulmonologist']}><AssessmentsPage /></ProtectedRoute>} />
        <Route path="/follow-up" element={<ProtectedRoute roles={['pulmonologist']}><FollowUpPage /></ProtectedRoute>} />
        <Route path="/exercise-library" element={<ExerciseLibraryPage />} />
        <Route path="/programs" element={<ProtectedRoute roles={['pulmonologist']}><ProgramsPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<FollowUpPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<ProtectedRoute roles={['admin']}><PlaceholderPage title="Platform settings" description="Configure organization details, access policies and approved notification rules." phase="01" /></ProtectedRoute>} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider></BrowserRouter>
}
