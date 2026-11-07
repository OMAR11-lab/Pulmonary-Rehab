import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { PatientLoginPage } from './pages/PatientLoginPage'
import { PatientActivationPage } from './pages/PatientActivationPage'
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

export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/patient-login" element={<PatientLoginPage />} />
    <Route path="/patient-activate" element={<PatientActivationPage />} />
    <Route path="/set-password" element={<SetPasswordPage />} />
    <Route element={<ProtectedRoute />}><Route element={<AppShell />}>
      <Route index element={<DashboardPage />} />
      <Route element={<ProtectedRoute roles={['admin']} />}><Route path="users" element={<UsersPage />} /></Route>
      <Route element={<ProtectedRoute roles={['pulmonologist']} />}>
        <Route path="patients" element={<PatientsPage />} />
        <Route path="assessments" element={<AssessmentsPage />} />
        <Route path="follow-up" element={<FollowUpPage />} />
      </Route>
      <Route element={<ProtectedRoute roles={['admin', 'pulmonologist', 'patient']} />}>
        <Route path="exercise-library" element={<ExerciseLibraryPage />} />
        <Route path="notifications" element={<FollowUpPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
      <Route element={<ProtectedRoute roles={['pulmonologist', 'patient']} />}>
        <Route path="programs" element={<ProgramsPage />} />
      </Route>
      <Route element={<ProtectedRoute roles={['admin']} />}><Route path="settings" element={<PlaceholderPage title="Platform settings" description="Configure organization details, access policies and approved notification rules." phase="01" />} /></Route>
    </Route></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider></BrowserRouter>
}
