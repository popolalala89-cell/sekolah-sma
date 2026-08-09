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

// ── Wali murid ────────────────────────────────────────────────────
export interface WaliMurid { id: string; nama: string; telepon: string | null; user_id: string | null }

export async function listWali(): Promise<WaliMurid[]> {
  const { data } = await supabase.from('wali_murid').select('*').order('nama')
  return (data ?? []) as WaliMurid[]
}

export async function simpanWali(w: Partial<WaliMurid> & { nama: string }): Promise<string | null> {
  const { data, error } = w.id
    ? await supabase.from('wali_murid').update(w).eq('id', w.id).select('id').single()
    : await supabase.from('wali_murid').insert(w).select('id').single()
  if (error) throw new Error(error.message)
  return data?.id ?? w.id ?? null
}

export async function hapusWali(id: string): Promise<void> {
  const { error } = await supabase.from('wali_murid').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** peta wali_id -> daftar siswa_id (relasi many-to-many) */
export async function waliSiswaMap(): Promise<Map<string, string[]>> {
  const { data } = await supabase.from('wali_siswa').select('wali_murid_id, siswa_id')
  const m = new Map<string, string[]>()
  ;(data ?? []).forEach((r) => {
    const wid = r.wali_murid_id as string
    const arr = m.get(wid) ?? []
    arr.push(r.siswa_id as string)
    m.set(wid, arr)
  })
  return m
}

/** set ulang relasi wali->anak: hapus semua lalu insert list baru */
export async function setWaliSiswa(waliId: string, siswaIds: string[]): Promise<void> {
  const { error: delErr } = await supabase.from('wali_siswa').delete().eq('wali_murid_id', waliId)
  if (delErr) throw new Error(delErr.message)
  if (siswaIds.length === 0) return
  const { error: insErr } = await supabase.from('wali_siswa').insert(
    siswaIds.map((sid) => ({ wali_murid_id: waliId, siswa_id: sid }))
  )
  if (insErr) throw new Error(insErr.message)
}

// akun login wali lewat RPC security-definer (admin saja)
export async function buatAkunWali(w: WaliMurid, password: string): Promise<string> {
  const email = `${w.id.slice(0, 8)}@sekolah.local`
  const { data, error } = await supabase.rpc('admin_buat_akun', {
    p_email: email, p_password: password, p_peran: 'wali', p_terkait_id: w.id,
  })
  if (error) throw error
  const uid = data as string
  const { error: upErr } = await supabase.from('wali_murid').update({ user_id: uid }).eq('id', w.id)
  if (upErr) throw new Error(upErr.message)
  return email
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

// ── Absensi ───────────────────────────────────────────────────────
export interface Mapel { id: string; kode: string; nama: string }
export interface AbsensiRow { id?: string; siswa_id: string; status: string; catatan?: string | null }

export async function listMapel(): Promise<Mapel[]> {
  const { data } = await supabase.from('mapel').select('id, kode, nama').order('kode')
  return (data ?? []) as Mapel[]
}

/** siswa dalam satu rombel (tahun aktif) — untuk grid absen */
export async function listSiswaRombel(rombelId: string, tahunId: string): Promise<Siswa[]> {
  const { data } = await supabase
    .from('rombel_siswa')
    .select('siswa:siswa(*)')
    .eq('rombel_id', rombelId).eq('tahun_ajaran_id', tahunId).order('siswa_id')
  const rows = (data ?? []) as unknown as { siswa: Siswa }[]
  return rows
    .map((r) => r.siswa)
    .sort((a, b) => a.nama.localeCompare(b.nama))
}

/** nilai absen per-siswa untuk (rombel, mapel, tanggal) */
export async function listAbsensi(rombelId: string, mapelId: string, tanggal: string): Promise<AbsensiRow[]> {
  const { data } = await supabase
    .from('absensi')
    .select('id, siswa_id, status, catatan')
    .eq('rombel_id', rombelId).eq('mapel_id', mapelId).eq('tanggal', tanggal)
  return (data ?? []) as AbsensiRow[]
}

export async function simpanAbsensi(rows: AbsensiRow[], guruId: string | null): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase.from('absensi').upsert(
    rows.map((r) => ({
      id: r.id, siswa_id: r.siswa_id, status: r.status, catatan: r.catatan ?? null,
      guru_id: guruId,
    })), { onConflict: 'siswa_id,tanggal,mapel_id' }
  )
  if (error) throw new Error(error.message)
}

/** id guru dari baris akun user yang login */
export async function guruIdLogin(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('akun').select('terkait_id').eq('user_id', user.id).maybeSingle()
  return (data?.terkait_id as string | null) ?? null
}

// ── Nilai & Rapor ────────────────────────────────────────────────
export const JENIS_NILAI = ['tugas', 'formatif', 'sumatif', 'uts', 'uas'] as const
export type JenisNilai = (typeof JENIS_NILAI)[number]
export const LABEL_JENIS: Record<string, string> = {
  tugas: 'Tugas', formatif: 'Formatif', sumatif: 'Sumatif', uts: 'UTS', uas: 'UAS',
}

export interface NilaiRow { id?: string | null; siswa_id: string; nilai: number | null }

/** nilai per-siswa untuk (rombel, mapel, jenis, semester) */
export async function listNilai(rombelId: string, mapelId: string, jenis: string, semester: number, tahunId: string): Promise<NilaiRow[]> {
  const { data } = await supabase
    .from('nilai')
    .select('id, siswa_id, nilai')
    .eq('rombel_id', rombelId).eq('mapel_id', mapelId)
    .eq('jenis', jenis).eq('semester', semester).eq('tahun_ajaran_id', tahunId)
  return (data ?? []) as NilaiRow[]
}

/** simpan massal: upsert baris terisi (unique siswa+mapel+semester+jenis), hapus yang dikosongkan */
export async function simpanNilai(
  rows: NilaiRow[], guruId: string | null, mapelId: string, rombelId: string,
  jenis: string, semester: number, tahunId: string,
): Promise<void> {
  const isi = rows.filter((r) => r.nilai !== null)
  const kosong = rows.filter((r) => r.nilai === null && r.id)
  if (isi.length > 0) {
    const { error } = await supabase.from('nilai').upsert(
      isi.map((r) => ({
        id: r.id ?? undefined, siswa_id: r.siswa_id, nilai: r.nilai,
        mapel_id: mapelId, rombel_id: rombelId, guru_id: guruId,
        jenis, semester, tahun_ajaran_id: tahunId,
      })),
      { onConflict: 'siswa_id,mapel_id,semester,jenis' },
    )
    if (error) throw new Error(error.message)
  }
  for (const r of kosong) {
    const { error } = await supabase.from('nilai').delete().eq('id', r.id)
    if (error) throw new Error(error.message)
  }
}

export interface RekapNilai {
  mapelId: string; kode: string; nama: string
  byJenis: Record<string, number | null>
  rerata: number | null
}

/** rekap nilai satu siswa per mapel untuk satu semester (untuk rapor) */
export async function rekapNilaiSiswa(siswaId: string, tahunId: string, semester: number): Promise<RekapNilai[]> {
  const { data, error } = await supabase
    .from('nilai')
    .select('mapel:mapel_id(id,kode,nama), jenis, nilai')
    .eq('siswa_id', siswaId).eq('tahun_ajaran_id', tahunId).eq('semester', semester)
  if (error) throw new Error(error.message)
  const m = new Map<string, RekapNilai>()
  ;(data ?? [] as any[]).forEach((r) => {
    const mpRaw = r.mapel
    const mp = (Array.isArray(mpRaw) ? mpRaw[0] : mpRaw) as { id?: string; kode?: string; nama?: string } | undefined
    if (!mp?.id) return
    let rec = m.get(mp.id)
    if (!rec) {
      rec = { mapelId: mp.id, kode: mp.kode ?? '', nama: mp.nama ?? '', byJenis: {}, rerata: null }
      m.set(mp.id, rec)
    }
    rec.byJenis[r.jenis as string] = Number(r.nilai)
  })
  const out = [...m.values()].sort((a, b) => a.kode.localeCompare(b.kode))
  out.forEach((o) => {
    const vals = JENIS_NILAI.map((j) => o.byJenis[j]).filter((v): v is number => v !== undefined && v !== null)
    o.rerata = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null
  })
  return out
}

/** nama sekolah aktif (untuk kop rapor) */
export async function namaSekolah(): Promise<string> {
  const { data } = await supabase.from('sekolah').select('nama').limit(1).maybeSingle()
  return (data?.nama as string | undefined) ?? 'Sekolah SMA'
}

/** predikat dari nilai rata-rata */
export function predikat(rerata: number | null): string {
  if (rerata === null) return '-'
  if (rerata >= 90) return 'A'
  if (rerata >= 80) return 'B'
  if (rerata >= 70) return 'C'
  if (rerata >= 60) return 'D'
  return 'E'
}

/** format angka 0-100 tanpa desimal kalau bulat */
export function fmtNilai(v: number | null | undefined): string {
  if (v === null || v === undefined) return '-'
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}