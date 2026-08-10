import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase, peranDariUser, type Peran } from './lib/supabase'
import { ToastProvider, Modal } from './lib/ui'
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
import TagihanSayaPage from './pages/TagihanSayaPage'

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

type NavItem = { to: string; label: string; icon: string }
type NavConf = { main: NavItem[]; fab?: NavItem; more?: NavItem[] }

const N = (to: string, label: string, icon: string): NavItem => ({ to, label, icon })

// main  = menu langsung di bottom-nav (mobile)
// fab   = tombol tengah raised (FAB)
// more  = menu tersembunyi di balik item "Lainnya" (sheet)
const NAVS: Record<Peran, NavConf> = {
  admin: {
    main: [N('/', 'Beranda', 'home'), N('/siswa', 'Siswa', 'groups'), N('/spp', 'SPP', 'payments')],
    fab: N('/rombel', 'Rombel', 'meeting_room'),
    more: [N('/guru', 'Guru', 'school'), N('/nilai', 'Nilai', 'scoreboard'), N('/wali', 'Wali', 'account_circle')],
  },
  guru: {
    main: [N('/', 'Beranda', 'home'), N('/absensi', 'Absensi', 'event_available'), N('/nilai', 'Nilai', 'scoreboard'), N('/rapor', 'Rapor', 'assignment'), N('/jadwal', 'Jadwal', 'calendar_month')],
  },
  wali: {
    main: [N('/', 'Beranda', 'home'), N('/rapor', 'Rapor', 'assignment'), N('/tagihan-saya', 'Tagihan', 'payments')],
  },
  siswa: {
    main: [N('/', 'Beranda', 'home'), N('/rapor', 'Rapor', 'assignment'), N('/tagihan-saya', 'Tagihan', 'payments')],
  },
}

const JUDUL: Record<string, string> = {
  '/': 'Beranda', '/siswa': 'Data Siswa', '/guru': 'Data Guru',
  '/rombel': 'Rombel', '/jurusan': 'Jurusan', '/wali': 'Wali Murid',
  '/nilai': 'Nilai', '/rapor': 'Rapor', '/jadwal': 'Jadwal', '/spp': 'Keuangan SPP',
  '/tagihan-saya': 'Tagihan SPP',
}

function Shell({ user, peran, children }: { user: User; peran: Peran | null; children: React.ReactNode }) {
  const loc = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const conf = (peran ? NAVS[peran] : null) as NavConf | null
  const more = conf?.more ?? []
  const all = conf ? [...conf.main, ...(conf.fab ? [conf.fab] : []), ...more] : []
  const active = all.find((x) => x.to === loc.pathname)
  const onMore = more.some((x) => x.to === loc.pathname)

  function go(to: string) {
    setMoreOpen(false)
    window.location.hash = '#' + to
  }

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

      {peran && conf && (
        <>
          {/* Mobile: bottom nav 5 slot — item / FAB raised tengah / "Lainnya" */}
          <nav className="bottom-nav bn-mobile">
            {conf.main.slice(0, 2).map((n) => {
              const isActive = loc.pathname === n.to
              return (
                <a key={n.to} href={`#${n.to}`} className={`bn-item${isActive ? ' active' : ''}`}>
                  <span className="bn-icon"><MIcon n={n.icon} /></span>
                  <span className="bn-label">{n.label}</span>
                </a>
              )
            })}

            {conf.fab ? (
              <a href={`#${conf.fab.to}`} className={`bn-fab${loc.pathname === conf.fab.to ? ' active' : ''}`}>
                <span className="bn-fab-inner"><MIcon n={conf.fab.icon} /></span>
                <span className="bn-fab-label">{conf.fab.label}</span>
              </a>
            ) : null}

            {conf.main.slice(2).map((n) => {
              const isActive = loc.pathname === n.to
              return (
                <a key={n.to} href={`#${n.to}`} className={`bn-item${isActive ? ' active' : ''}`}>
                  <span className="bn-icon"><MIcon n={n.icon} /></span>
                  <span className="bn-label">{n.label}</span>
                </a>
              )
            })}

            {more.length > 0 && (
              <button className={`bn-item ${onMore ? 'active' : ''}`} onClick={() => setMoreOpen(true)}>
                <span className="bn-icon"><MIcon n="menu" /></span>
                <span className="bn-label">Lainnya</span>
              </button>
            )}
          </nav>

          {/* Desktop: sidebar daftar LENGKAP (main + fab + more) */}
          <nav className="bottom-nav bn-side">
            {all.map((n) => {
              const isActive = loc.pathname === n.to
              return (
                <a key={n.to} href={`#${n.to}`} className={`bn-item${isActive ? ' active' : ''}`}>
                  <span className="bn-icon"><MIcon n={n.icon} /></span>
                  <span className="bn-label">{n.label}</span>
                </a>
              )
            })}
          </nav>

          <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Semua menu">
            {more.map((m) => (
              <button key={m.to} className="list-item nav-more-item"
                onClick={() => go(m.to)}>
                <span className="li-avatar"><MIcon n={m.icon} /></span>
                <span className="li-body"><span className="li-title">{m.label}</span></span>
                <span className="li-trailing" style={{ color: 'var(--on-surface-variant)' }}><MIcon n="chevron_right" /></span>
              </button>
            ))}
          </Modal>
        </>
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
        <Route path="/rapor" element={<Guarded peran={peran} roles={['admin', 'guru', 'wali', 'siswa']}><RaporPage peran={peran!} /></Guarded>} />
        <Route path="/jadwal" element={<Guarded peran={peran} roles={['admin', 'guru']}><JadwalPage /></Guarded>} />
        <Route path="/spp" element={<Guarded peran={peran} roles={['admin']}><SppPage /></Guarded>} />
        <Route path="/tagihan-saya" element={<Guarded peran={peran} roles={['wali', 'siswa']}><TagihanSayaPage peran={peran!} /></Guarded>} />
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