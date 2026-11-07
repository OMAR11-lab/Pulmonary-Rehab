import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import type { AppRole } from '../types/database'

export function ProtectedRoute({ roles }: { roles?: AppRole[] }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="screen-loader"><span className="loader" />Loading secure workspace…</div>
  if (!user) return <Navigate to="/login" replace />
  if (!profile || !profile.is_active) return <div className="screen-loader"><div className="notice-card"><strong>Account access unavailable</strong><p>Your account is not active or its role profile has not been configured. Contact the platform administrator.</p></div></div>
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />
  return <Outlet />
}
