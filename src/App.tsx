import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase, peranDariUser, type Peran } from './lib/supabase'

// ── Auth state hook ─────────────────────────────────────────────
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

// ── Login ────────────────────────────────────────────────────────
function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function masuk(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      setErr(error.message === 'Invalid login credentials' ? 'Email atau password salah' : error.message)
    }
    // sukses → useAuth listener otomatis redirect ke /
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={masuk} className="bg-white rounded-2xl shadow-lg p-8 w-80 space-y-4">
        <h1 className="text-2xl font-bold text-center text-slate-800">SekolahSMA</h1>
        <p className="text-center text-sm text-slate-500">Masuk ke sistem sekolah</p>
        <input
          className="w-full border rounded-lg px-3 py-2"
          type="email" required placeholder="Email / NISN@sekolah.local"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border rounded-lg px-3 py-2"
          type="password" required placeholder="Password"
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button
          disabled={busy}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 font-medium"
        >
          {busy ? 'Masuk...' : 'Masuk'}
        </button>
      </form>
    </div>
  )
}

// ── Dashboard placeholder per peran (Fase 1.1 — prodi diisi Fase 1.2+) ──
function Dashboard({ peran }: { peran: Peran | null }) {
  const judul: Record<string, string> = {
    admin: 'Admin TU',
    guru: 'Guru',
    wali: 'Wali Murid',
    siswa: 'Siswa',
  }
  const menu: Record<string, string[]> = {
    admin: ['Siswa', 'Guru', 'Rombel', 'Jadwal', 'Absensi', 'Nilai', 'Keuangan', 'Akun'],
    guru: ['Absensi', 'Nilai', 'Jadwal'],
    wali: ['Nilai Anak', 'Absensi Anak', 'Tagihan'],
    siswa: ['Nilai', 'Jadwal', 'Absensi'],
  }
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-slate-800">SekolahSMA</span>
        <button
          className="text-sm text-red-600"
          onClick={() => supabase.auth.signOut()}
        >
          Keluar
        </button>
      </header>
      <main className="p-6 space-y-4">
        <h2 className="text-xl font-semibold text-slate-800">Dashboard {judul[peran ?? 'siswa']}</h2>
        {peran === null ? (
          <p className="text-amber-700 bg-amber-50 border rounded-lg p-4">
            Akunmu belum punya peran — minta admin menghubungkan akunmu.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {menu[peran].map((m) => (
              <div key={m} className="bg-white rounded-xl shadow p-4 text-center text-slate-700">
                {m}
                <div className="text-xs text-slate-400 mt-1">Fase 1.2+</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// ── App ─────────────────────────────────────────────────────────
export default function App() {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="min-h-screen grid place-items-center text-slate-500">Memuat...</div>
  }
  const peran = peranDariUser(user)
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={user ? <Dashboard peran={peran} /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}