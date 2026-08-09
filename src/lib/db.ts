import { supabase } from './supabase'

export type { Peran } from './supabase'

export interface Siswa {
  id: string; nisn: string; nis: string | null; nama: string
  gender: 'L' | 'P' | null; tempat_lahir: string | null; tgl_lahir: string | null
  alamat: string | null; telepon: string | null; status: string; angkatan: number | null
  user_id: string | null
}
export interface Jurusan { id: string; kode: string; nama: string }
export interface Guru { id: string; nama: string; nip: string | null; mapel_utama: string | null; user_id: string | null }
export interface Rombel { id: string; nama: string; tingkat: number; jurusan_id: string | null; wali_kelas_guru_id: string | null; aktif: boolean }

export interface RombelSiswa { rombel_id: string; siswa_id: string; tahun_ajaran_id: string }

// ── Master kecil ──────────────────────────────────────────────────
export async function tahunAktifId(): Promise<string | null> {
  const { data } = await supabase.from('tahun_ajaran').select('id, nama').eq('aktif', true).limit(1).maybeSingle()
  return data?.id ?? null
}

// ── Rombel ────────────────────────────────────────────────────────
export async function listRombel(tahunId: string): Promise<Rombel[]> {
  const { data } = await supabase
    .from('rombel').select('id, nama, tingkat, jurusan_id, wali_kelas_guru_id, aktif')
    .eq('tahun_ajaran_id', tahunId).order('nama')
  return (data ?? []) as Rombel[]
}

export async function rombelSiswaMap(tahunId: string): Promise<Map<string, string>> {
  const { data } = await supabase
    .from('rombel_siswa').select('siswa_id, rombel_id')
    .eq('tahun_ajaran_id', tahunId)
  const m = new Map<string, string>()
  ;(data ?? []).forEach((r) => m.set(r.siswa_id as string, r.rombel_id as string))
  return m
}

// ── Siswa ─────────────────────────────────────────────────────────
export async function listSiswa(): Promise<Siswa[]> {
  const { data } = await supabase.from('siswa').select('*').order('nama')
  return (data ?? []) as Siswa[]
}

export async function simpanSiswa(s: Partial<Siswa> & { nama: string; nisn: string }): Promise<string | null> {
  const { data, error } = s.id
    ? await supabase.from('siswa').update(s).eq('id', s.id).select('id').single()
    : await supabase.from('siswa').insert(s).select('id').single()
  if (error) throw new Error(error.message)
  return data?.id ?? s.id ?? null
}

export async function hapusSiswa(id: string): Promise<void> {
  const { error } = await supabase.from('siswa').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// rombel assignment (tahun aktif)
export async function setRombelSiswa(siswaId: string, rombelId: string | null, tahunId: string): Promise<void> {
  if (!rombelId) return
  await supabase
    .from('rombel_siswa').upsert({ siswa_id: siswaId, rombel_id: rombelId, tahun_ajaran_id: tahunId })
    .eq('siswa_id', siswaId)
}

// akun login lewat RPC security-definer (admin saja)
export async function buatAkunSiswa(siswa: Siswa, password: string): Promise<string> {
  const email = `${siswa.nisn.toLowerCase()}@sekolah.local`
  const { data, error } = await supabase.rpc('admin_buat_akun', {
    p_email: email, p_password: password, p_peran: 'siswa', p_terkait_id: siswa.id,
  })
  if (error) throw error
  const uid = data as string
  const { error: upErr } = await supabase.from('siswa').update({ user_id: uid }).eq('id', siswa.id)
  if (upErr) throw new Error(upErr.message)
  return email
}

// ── Guru ──────────────────────────────────────────────────────────
export async function listGuru(): Promise<Guru[]> {
  const { data } = await supabase.from('guru').select('*').order('nama')
  return (data ?? []) as Guru[]
}
export async function simpanGuru(g: Partial<Guru> & { nama: string }): Promise<void> {
  const { error } = g.id
    ? await supabase.from('guru').update(g).eq('id', g.id)
    : await supabase.from('guru').insert(g)
  if (error) throw new Error(error.message)
}
export async function hapusGuru(id: string): Promise<void> {
  const { error } = await supabase.from('guru').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Jurusan ───────────────────────────────────────────────────────
export async function listJurusan(): Promise<Jurusan[]> {
  const { data } = await supabase.from('jurusan').select('*').order('kode')
  return (data ?? []) as Jurusan[]
}
export async function simpanJurusan(j: Partial<Jurusan> & { kode: string; nama: string }): Promise<void> {
  const { error } = j.id
    ? await supabase.from('jurusan').update(j).eq('id', j.id)
    : await supabase.from('jurusan').insert(j)
  if (error) throw new Error(error.message)
}
export async function hapusJurusan(id: string): Promise<void> {
  const { error } = await supabase.from('jurusan').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Rombel ────────────────────────────────────────────────────────
export async function simpanRombel(r: Partial<Rombel> & { nama: string; tingkat: number }, tahunId: string): Promise<void> {
  const { error } = r.id
    ? await supabase.from('rombel').update(r).eq('id', r.id)
    : await supabase.from('rombel').insert({ ...r, tahun_ajaran_id: tahunId })
  if (error) throw new Error(error.message)
}
export async function hapusRombel(id: string): Promise<void> {
  const { error } = await supabase.from('rombel').delete().eq('id', id)
  if (error) throw new Error(error.message)
}