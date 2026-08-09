import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { btn } from '../lib/ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function masuk(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      setErr(error.message === 'Invalid login credentials' ? 'Email atau password salah' : error.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={masuk} className="bg-white rounded-2xl shadow-lg p-8 w-80 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">SekolahSMA</h1>
          <p className="text-sm text-slate-500 mt-1">Sistem Informasi Sekolah</p>
        </div>
        <input className="w-full border rounded-lg px-3 py-2 text-sm" type="email" required placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border rounded-lg px-3 py-2 text-sm" type="password" required placeholder="Password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <p className="text-red-600 text-xs">{err}</p>}
        <button disabled={busy} className={btn + ' w-full'}>{busy ? 'Masuk...' : 'Masuk'}</button>
      </form>
    </div>
  )
}