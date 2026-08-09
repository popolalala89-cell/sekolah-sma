import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase, peranDariUser, type Peran } from './lib/supabase'
import { ToastProvider } from './lib/ui'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SiswaPage from './pages/SiswaPage'
import GuruPage from './pages/GuruPage'
import RombelPage from './pages/RombelPage'
import JurusanPage from './pages/JurusanPage'

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

function Protected({ peran, children }: { peran: Peran | null; children: React.ReactNode }) {
  return peran === 'admin' ? <>{children}</> : <Navigate to="/" replace />
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center text-slate-500">Memuat...</div>
  const peran = peranDariUser(user)

  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={user ? <Dashboard peran={peran} email={user.email} /> : <Navigate to="/login" replace />} />
          <Route path="/siswa" element={user ? <Protected peran={peran}><SiswaPage /></Protected> : <Navigate to="/login" replace />} />
          <Route path="/guru" element={user ? <Protected peran={peran}><GuruPage /></Protected> : <Navigate to="/login" replace />} />
          <Route path="/rombel" element={user ? <Protected peran={peran}><RombelPage /></Protected> : <Navigate to="/login" replace />} />
          <Route path="/jurusan" element={user ? <Protected peran={peran}><JurusanPage /></Protected> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ToastProvider>
  )
}