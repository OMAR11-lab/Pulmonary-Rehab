import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { Activity, Bell, CalendarDays, ClipboardList, FileText, HeartPulse, LayoutDashboard, LogOut, Settings, ShieldCheck, Users, Wind } from 'lucide-react'
import { useAuth } from '../lib/auth'

const titleMap: Record<string, string> = {
  '/': 'Overview', '/users': 'User management', '/patients': 'Patients', '/assessments': 'Clinical assessments',
  '/exercise-library': 'Exercise library', '/programs': 'Rehabilitation plans', '/reports': 'Reports', '/settings': 'Settings', '/follow-up': 'Follow-up', '/notifications': 'Notifications',
}

export function AppShell() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const role = profile?.role
  const links = role === 'admin'
    ? [{ to: '/', label: 'Overview', icon: LayoutDashboard }, { to: '/users', label: 'User management', icon: Users }, { to: '/exercise-library', label: 'Exercise library', icon: Activity }, { to: '/reports', label: 'System reports', icon: FileText }, { to: '/settings', label: 'Settings', icon: Settings }]
    : role === 'pulmonologist'
      ? [{ to: '/', label: 'Overview', icon: LayoutDashboard }, { to: '/patients', label: 'My patients', icon: Users }, { to: '/assessments', label: 'Assessments', icon: ClipboardList }, { to: '/follow-up', label: 'Follow-up', icon: CalendarDays }, { to: '/exercise-library', label: 'Exercise library', icon: Activity }, { to: '/programs', label: 'Rehabilitation plans', icon: HeartPulse }, { to: '/reports', label: 'Reports', icon: FileText }]
      : [{ to: '/', label: 'My rehabilitation', icon: LayoutDashboard }, { to: '/programs', label: 'My plan', icon: HeartPulse }, { to: '/reports', label: 'My progress', icon: Activity }]
  const pageTitle = titleMap[location.pathname] ?? 'Pulmonary rehabilitation'
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Wind size={22} /></div><div><strong>Respira</strong><span>ASTHMA REHABILITATION</span></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="privacy-note"><ShieldCheck size={17} /><span>Secure clinical workspace</span></div><button className="profile-menu" onClick={() => { void signOut().then(() => navigate(role === 'patient' ? '/patient-login' : '/login', { replace: true })) }}><div className="avatar">{profile?.full_name?.slice(0, 1).toUpperCase() || 'U'}</div><div className="profile-copy"><strong>{profile?.full_name || 'User'}</strong><span>{role === 'admin' ? 'Administrator' : role === 'pulmonologist' ? 'Pulmonologist' : 'Patient'}</span></div><LogOut size={17} /></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div><div className="eyebrow">BRONCHIAL ASTHMA PROGRAM</div><h1>{pageTitle}</h1></div><div className="topbar-actions"><span className="role-chip">{role?.replace('_', ' ')}</span><Link className="icon-button" aria-label="Notifications" to="/notifications"><Bell size={18} /></Link></div></header>
      <div className="page-content"><Outlet /></div>
      <footer className="app-footer"><span>Respira · Pulmonary Rehabilitation Platform</span><span>Clinical decisions remain with the treating team.</span></footer>
    </main>
  </div>
}
