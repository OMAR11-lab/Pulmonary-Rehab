import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import type { ReactNode } from 'react'
import type { AppRole } from '../types/database'

export function ProtectedRoute({ roles, children }: { roles?: AppRole[]; children?: ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="screen-loader"><span className="loader" />جارٍ تحميل الصفحة…</div>
  if (!user) return <Navigate to={roles?.includes('patient') ? '/patient-login' : '/login'} replace />
  if (!profile || !profile.is_active) return <div className="screen-loader"><div className="notice-card"><strong>تعذر تفعيل الحساب</strong><p>يرجى التواصل مع العيادة.</p></div></div>
  if (roles && !roles.includes(profile.role)) {
    return <Navigate to={profile.role === 'patient' ? '/patient-portal' : '/dashboard'} replace />
  }
  return children ?? <Outlet />
}
