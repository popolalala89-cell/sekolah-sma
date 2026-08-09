import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase, peranDariUser, type Peran } from './lib/supabase'
import { ToastProvider } from './lib/ui'
import { MIcon } from './lib/icons'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SiswaPage from './pages/SiswaPage'
import GuruPage from './pages/GuruPage'
import RombelPage from './pages/RombelPage'
import JurusanPage from './pages/JurusanPage'
import WaliPage from './pages/WaliPage'
import AbsensiPage from './pages/AbsensiPage'
import NilaiPage from './pages/NilaiPage'
import RaporPage from './pages/RaporPage'
import JadwalPage from './pages/JadwalPage'
import SppPage from './pages/SppPage'

function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])
  return { user, loading }
}

const NAV = [
  { to: '/', label: 'Beranda', icon: 'home' },
  { to: '/siswa', label: 'Siswa', icon: 'groups' },
  { to: '/guru', label: 'Guru', icon: 'school' },
  { to: '/rombel', label: 'Rombel', icon: 'meeting_room' },
  { to: '/spp', label: 'SPP', icon: 'payments' },
  { to: '/nilai', label: 'Nilai', icon: 'scoreboard' },
  { to: '/wali', label: 'Wali', icon: 'account_circle' },
]

const JUDUL: Record<string, string> = {
  '/': 'Beranda', '/siswa': 'Data Siswa', '/guru': 'Data Guru',
  '/rombel': 'Rombel', '/jurusan': 'Jurusan', '/wali': 'Wali Murid',
  '/nilai': 'Nilai', '/rapor': 'Rapor', '/jadwal': 'Jadwal', '/spp': 'Keuangan SPP',
}

function Shell({ user, peran, children }: { user: User; peran: Peran | null; children: React.ReactNode }) {
  const loc = useLocation()
  const active = NAV.find((n) => n.to === loc.pathname)
  return (
    <div className="app-layout">
      <header className="top-app-bar">
        <span className="bar-title">{active?.label ?? JUDUL[loc.pathname] ?? 'SekolahSMA'}</span>
        <span className="avatar">{user.email ? user.email.charAt(0).toUpperCase() : '?'}</span>
        <button className="icon-btn" title="Keluar" onClick={() => supabase.auth.signOut()}>
          <MIcon n="logout" />
        </button>
      </header>

      <div className="app-scroll">{children}</div>

      {peran === 'admin' && (
        <nav className="bottom-nav">
          {NAV.map((n) => {
            const isActive = loc.pathname === n.to
            return (
              <a key={n.to} href={`#${n.to}`} className={`bn-item${isActive ? ' active' : ''}`}>
                <span className="bn-icon"><MIcon n={n.icon} /></span>
                <span className="bn-label">{n.label}</span>
              </a>
            )
          })}
        </nav>
      )}
    </div>
  )
}

function Guarded({ peran, roles, children }: { peran: Peran | null; roles: Peran[]; children: React.ReactNode }) {
  return peran && roles.includes(peran) ? <>{children}</> : <Navigate to="/" replace />
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="login-screen" style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>Memuat...</div>
  const peran = peranDariUser(user)

  if (!user) return <Login />
  return (
    <Shell user={user} peran={peran}>
      <Routes>
        <Route path="/" element={<Dashboard peran={peran} email={user.email} />} />
        <Route path="/siswa" element={<Guarded peran={peran} roles={['admin']}><SiswaPage /></Guarded>} />
        <Route path="/guru" element={<Guarded peran={peran} roles={['admin']}><GuruPage /></Guarded>} />
        <Route path="/rombel" element={<Guarded peran={peran} roles={['admin']}><RombelPage /></Guarded>} />
        <Route path="/jurusan" element={<Guarded peran={peran} roles={['admin']}><JurusanPage /></Guarded>} />
        <Route path="/wali" element={<Guarded peran={peran} roles={['admin']}><WaliPage /></Guarded>} />
        <Route path="/absensi" element={<Guarded peran={peran} roles={['admin', 'guru']}><AbsensiPage /></Guarded>} />
        <Route path="/nilai" element={<Guarded peran={peran} roles={['admin', 'guru']}><NilaiPage /></Guarded>} />
        <Route path="/rapor" element={<Guarded peran={peran} roles={['admin', 'guru']}><RaporPage /></Guarded>} />
        <Route path="/jadwal" element={<Guarded peran={peran} roles={['admin', 'guru']}><JadwalPage /></Guarded>} />
        <Route path="/spp" element={<Guarded peran={peran} roles={['admin']}><SppPage /></Guarded>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </ToastProvider>
  )
}