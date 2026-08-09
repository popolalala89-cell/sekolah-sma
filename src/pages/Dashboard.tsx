import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Peran } from '../lib/supabase'

export default function Dashboard({ peran, email }: { peran: Peran | null; email?: string }) {  const judul: Record<string, string> = { admin: 'Admin TU', guru: 'Guru', wali: 'Wali Murid', siswa: 'Siswa' }
  const menu = peran === 'admin'
    ? [
        { label: 'Data Siswa', sub: 'siswa, rombel, akun', to: '/siswa' },
        { label: 'Data Guru', sub: 'profil guru', to: '/guru' },
        { label: 'Rombel', sub: 'kelas & wali kelas', to: '/rombel' },
        { label: 'Jurusan', sub: 'IPA / IPS / BHS', to: '/jurusan' },
        { label: 'Absensi', sub: 'Fase 1.3', to: '/dash' },
        { label: 'Nilai & Rapor', sub: 'Fase 1.4', to: '/dash' },
        { label: 'Jadwal', sub: 'Fase 1.5', to: '/dash' },
        { label: 'Keuangan SPP', sub: 'Fase 1.6', to: '/dash' },
      ]
    : [
        { label: 'Dashboard Saya', sub: peran === 'guru' ? 'Absensi & nilai' : 'Info anak', to: '/dash' },
      ]

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow px-5 py-3 flex items-center justify-between">
        <span className="font-bold text-slate-800">SekolahSMA</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500 hidden sm:block">{email}</span>
          <button className="text-red-600" onClick={() => supabase.auth.signOut()}>
            Keluar
          </button>
        </div>
      </header>
      <main className="p-4 max-w-4xl mx-auto space-y-4">
        <h2 className="text-xl font-semibold text-slate-800">Dashboard {judul[peran ?? 'siswa']}</h2>
        {peran === null && (
          <p className="text-amber-700 bg-amber-50 border rounded-lg p-4 text-sm">
            Akunmu belum punya peran — minta admin menghubungkan akunmu.
          </p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {menu.map((m) => (
            <Link key={m.label} to={m.to}
              className="bg-white rounded-xl shadow p-4 hover:shadow-md transition">
              <div className="font-medium text-slate-800 text-sm">{m.label}</div>
              <div className="text-xs text-slate-400 mt-1">{m.sub}</div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )

}