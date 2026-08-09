import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { btn, inSel } from '../lib/ui'
import { MIcon } from '../lib/icons'

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
    <div className="login-screen">
      <div className="login-logo">
        <MIcon n="school" />
      </div>
      <h1 className="login-title">SekolahSMA</h1>
      <p className="login-sub">Sistem Informasi Sekolah</p>
      <form onSubmit={masuk} className="login-card">
        <div className="field">
          <span>Email</span>
          <input className={inSel} type="email" required placeholder="nama@sekolah.local" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <span>Password</span>
          <input className={inSel} type="password" required placeholder="••••••••" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <p style={{ color: 'var(--error)', fontSize: '0.78rem', marginBottom: 10 }}>{err}</p>}
        <button disabled={busy} className={btn + ' btn-block'}>{busy ? 'Masuk...' : 'Masuk'}</button>
      </form>
    </div>
  )
}