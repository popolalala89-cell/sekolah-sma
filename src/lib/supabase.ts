import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY belum diisi di .env.local')
}

// Client publik (anon) — aman dipakai di frontend, RLS yang menjaga data
export const supabase = createClient(url, key)

export type Peran = 'admin' | 'guru' | 'wali' | 'siswa'

/** Baca peran dari app_metadata JWT (di-set saat akun dibuat via RPC admin) */
export function peranDariUser(u: { app_metadata?: Record<string, unknown> } | null): Peran | null {
  const p = u?.app_metadata?.peran
  return p === 'admin' || p === 'guru' || p === 'wali' || p === 'siswa' ? (p as Peran) : null
}