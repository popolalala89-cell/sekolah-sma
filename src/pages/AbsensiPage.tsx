import { useEffect, useMemo, useState } from 'react'
import {
  tahunAktifId, listRombel, listMapel, listSiswaRombel, listAbsensi, simpanAbsensi, guruIdLogin,
  type Rombel, type Mapel, type Siswa, type AbsensiRow,
} from '../lib/db'
import { Confirm, useToast, inSel, btn } from '../lib/ui'
import { MIcon } from '../lib/icons'
import { supabase } from '../lib/supabase'

const STATUSES = [
  { k: 'H', label: 'Hadir' },
  { k: 'S', label: 'Sakit' },
  { k: 'I', label: 'Izin' },
  { k: 'A', label: 'Alpa' },
  { k: 'T', label: 'Telat' },
]

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AbsensiPage() {
  const toast = useToast()
  const [tahunId, setTahunId] = useState<string | null>(null)
  const [rombels, setRombels] = useState<Rombel[]>([])
  const [mapels, setMapels] = useState<Mapel[]>([])
  const [guruId, setGuruId] = useState<string | null>(null)

  const [rombelId, setRombelId] = useState('')
  const [mapelId, setMapelId] = useState('')
  const [tanggal, setTanggal] = useState(today())

  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [rows, setRows] = useState<Record<string, AbsensiRow>>({})
  const [busy, setBusy] = useState(true)
  const [simpanBusy, setSimpanBusy] = useState(false)
  const [tanyaSimpan, setTanyaSimpan] = useState(false)

  // muat master
  useEffect(() => {
    ;(async () => {
      try {
        const [t, rs, ms, g] = await Promise.all([
          tahunAktifId(), listRombel('') , listMapel(), guruIdLogin(),
        ])
        // rombel perlu tahun aktif; fetch ulang kalau t ada
        let list = rs
        if (t) {
          const { data } = await supabase.from('rombel').select('id, nama, tingkat, jurusan_id, wali_kelas_guru_id, aktif').eq('tahun_ajaran_id', t).order('nama')
          list = (data ?? []) as Rombel[]
        }
        setTahunId(t); setRombels(list); setMapels(ms); setGuruId(g)
      } catch (e: any) { toast(e.message, 'err') }
      finally { setBusy(false) }
    })()
  }, [])

  // muat absen saat rombel+mapel+tanggal berubah
  useEffect(() => {
    if (!rombelId || !mapelId) { setSiswaList([]); setRows({}); return }
    ;(async () => {
      try {
        const [siswa, abs] = await Promise.all([
          listSiswaRombel(rombelId, tahunId!),
          listAbsensi(rombelId, mapelId, tanggal),
        ])
        setSiswaList(siswa)
        const m: Record<string, AbsensiRow> = {}
        abs.forEach((a) => { m[a.siswa_id] = a })
        setRows(m)
      } catch (e: any) { toast(e.message, 'err') }
    })()
  }, [rombelId, mapelId, tanggal, tahunId])

  function setStatus(siswaId: string, k: string) {
    setRows((prev) => {
      const old = prev[siswaId]
      if (old && old.status === k) {
        // klik status yang sama = hapus (full reset)
        const { [siswaId]: _ , ...rest } = prev
        return rest
      }
      return { ...prev, [siswaId]: { id: old?.id, siswa_id: siswaId, status: k } }
    })
  }

  async function simpan() {
    const all: AbsensiRow[] = siswaList.map((s) => rows[s.id] ?? { siswa_id: s.id, status: 'H' })
    setSimpanBusy(true)
    try {
      await simpanAbsensi(all, guruId)
      toast('Absensi tersimpan', 'ok')
      // muat ulang supaya id key
      const abs = await listAbsensi(rombelId, mapelId, tanggal)
      const m: Record<string, AbsensiRow> = {}
      abs.forEach((a) => { m[a.siswa_id] = a })
      setRows(m)
    } catch (e: any) { toast(e.message, 'err') }
    finally { setSimpanBusy(false) }
  }

  const ringkas = useMemo(() => {
    const c: Record<string, number> = { H: 0, S: 0, I: 0, A: 0, T: 0 }
    siswaList.forEach((s) => {
      const st = rows[s.id]?.status ?? 'H'
      c[st] = (c[st] ?? 0) + 1
    })
    return c
  }, [siswaList, rows])

  const belumAbsen = siswaList.filter((s) => !rows[s.id]).length

  return (
    <div className="page-wrap">
      <h1 className="page-title">Absensi</h1>
      <p className="page-sub">Kehadiran per rombel & mata pelajaran</p>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="form-grid">
          <div className="field">
            <span>Rombel</span>
            <select className={inSel} value={rombelId} onChange={(e) => setRombelId(e.target.value)}>
              <option value="">— pilih —</option>
              {rombels.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
            </select>
          </div>
          <div className="field">
            <span>Mapel</span>
            <select className={inSel} value={mapelId} onChange={(e) => setMapelId(e.target.value)}>
              <option value="">— pilih —</option>
              {mapels.map((m) => <option key={m.id} value={m.id}>{m.kode} — {m.nama}</option>)}
            </select>
          </div>
          <div className="field">
            <span>Tanggal</span>
            <input type="date" className={inSel} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
        </div>

        {siswaList.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {STATUSES.map((s) => (
              <span key={s.k} className="badge outline" style={{ fontSize: '0.72rem' }}>
                {s.k} = {s.label} · {ringkas[s.k]} siswa
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {busy ? <p className="empty">Memuat...</p> : !rombelId || !mapelId ? (
          <div className="empty"><MIcon n="event_available" /><p>Pilih rombel & mapel dulu</p></div>
        ) : siswaList.length === 0 ? (
          <div className="empty"><MIcon n="groups" /><p>Rombel belum punya siswa (input di Data Siswa)</p></div>
        ) : (
          siswaList.map((s, i) => {
            const st = rows[s.id]?.status ?? 'H'
            return (
              <div key={s.id}>
                {i > 0 && <div className="list-divider" />}
                <div className="list-item">
                  <div className="li-avatar">{s.nama.charAt(0)}</div>
                  <div className="li-body">
                    <div className="li-title">{s.nama}</div>
                    <div className="li-sub">{s.nisn}{rows[s.id]?.catatan ? ` · ${rows[s.id].catatan}` : ''}</div>
                  </div>
                  <div className="li-trailing" style={{ gap: 4 }}>
                    {STATUSES.map((p) => (
                      <button
                        key={p.k}
                        className={`st-chip${st === p.k ? ' on' : ''}`}
                        onClick={() => setStatus(s.id, p.k)}
                        title={p.label}
                      >{p.k}</button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {siswaList.length > 0 && (
        <>
          <p style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', margin: '10px 2px' }}>
            {belumAbsen > 0 ? `${belumAbsen} siswa belum absen (akan dihitung Hadir)` : 'Semua siswa sudah diabsensi'}
          </p>
          <button className={btn + ' btn-block'} disabled={simpanBusy} onClick={() => setTanyaSimpan(true)}>
            {simpanBusy ? 'Menyimpan...' : 'Simpan Absensi'}
          </button>
        </>
      )}

      <Confirm open={tanyaSimpan} onClose={() => setTanyaSimpan(false)} onYes={simpan}
        title="Simpan absensi?" desc="Siswa tanpa status dihitung Hadir (H)." />
    </div>
  )
}