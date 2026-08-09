import { Link } from 'react-router-dom'
import type { Peran } from '../lib/supabase'
import { MIcon } from '../lib/icons'

export default function Dashboard({ peran, email }: { peran: Peran | null; email?: string }) {
  const judul: Record<string, string> = { admin: 'Admin TU', guru: 'Guru', wali: 'Wali Murid', siswa: 'Siswa' }
  const menu = peran === 'admin'
    ? [
        { label: 'Data Siswa', sub: 'siswa, rombel, akun', to: '/siswa', icon: 'groups' },
        { label: 'Data Guru', sub: 'profil guru', to: '/guru', icon: 'school' },
        { label: 'Rombel', sub: 'kelas & wali kelas', to: '/rombel', icon: 'meeting_room' },
        { label: 'Jurusan', sub: 'IPA / IPS / BHS', to: '/jurusan', icon: 'category' },
        { label: 'Wali Murid', sub: 'link wali ke anak', to: '/wali', icon: 'family_restroom' },
        { label: 'Absensi', sub: 'input & rekap kehadiran', to: '/absensi', icon: 'event_available' },
        { label: 'Nilai', sub: 'input nilai per kelas', to: '/nilai', icon: 'scoreboard' },
        { label: 'Rapor', sub: 'rekap & cetak per siswa', to: '/rapor', icon: 'assignment' },
        { label: 'Jadwal', sub: 'Fase 1.5', to: '/', icon: 'calendar_month' },
        { label: 'Keuangan SPP', sub: 'Fase 1.6', to: '/', icon: 'payments' },
      ]
    : [
        { label: 'Dashboard Saya', sub: peran === 'guru' ? 'Absensi & nilai' : 'Info anak', to: '/', icon: 'dashboard' },
        ...(peran === 'guru'
          ? [
              { label: 'Absensi', sub: 'input kehadiran', to: '/absensi', icon: 'event_available' },
              { label: 'Nilai', sub: 'input nilai kelas', to: '/nilai', icon: 'scoreboard' },
              { label: 'Rapor', sub: 'rekap & cetak', to: '/rapor', icon: 'assignment' },
            ]
          : []),
      ]

  return (
    <div className="page-wrap">
      <h1 className="page-title">Dashboard {judul[peran ?? 'siswa']}</h1>
      <p className="page-sub">{email}</p>

      {peran === null && (
        <div className="card" style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', border: 'none' }}>
          Akunmu belum punya peran — minta admin menghubungkan akunmu.
        </div>
      )}

      <div className="menu-grid">
        {menu.map((m) => (
          <Link key={m.label} to={m.to} className="menu-tile">
            <div className="mt-icon"><MIcon n={m.icon} /></div>
            <div className="mt-label">{m.label}</div>
            <div className="mt-sub">{m.sub}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}