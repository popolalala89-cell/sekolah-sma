import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  tahunAktifId, listRombel, listMapel, listSiswaRombel, listNilai, simpanNilai, guruIdLogin,
  JENIS_NILAI, LABEL_JENIS,
  type Rombel, type Mapel, type Siswa,
} from '../lib/db'
import { Confirm, useToast, inSel, btn } from '../lib/ui'
import { MIcon } from '../lib/icons'
import { supabase } from '../lib/supabase'

export default function NilaiPage() {
  const toast = useToast()
  const [tahunId, setTahunId] = useState<string | null>(null)
  const [rombels, setRombels] = useState<Rombel[]>([])
  const [mapels, setMapels] = useState<Mapel[]>([])
  const [guruId, setGuruId] = useState<string | null>(null)

  const [rombelId, setRombelId] = useState('')
  const [mapelId, setMapelId] = useState('')
  const [jenis, setJenis] = useState<string>('tugas')
  const [semester, setSemester] = useState(1)

  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [vals, setVals] = useState<Record<string, string>>({})
  const [ids, setIds] = useState<Record<string, string | null>>({})
  const [busy, setBusy] = useState(true)
  const [simpanBusy, setSimpanBusy] = useState(false)
  const [tanyaSimpan, setTanyaSimpan] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [t, rs, ms, g] = await Promise.all([tahunAktifId(), listRombel(''), listMapel(), guruIdLogin()])
        let list = rs
        if (t) {
          const { data } = await supabase.from('rombel')
            .select('id, nama, tingkat, jurusan_id, wali_kelas_guru_id, aktif')
            .eq('tahun_ajaran_id', t).order('nama')
          list = (data ?? []) as Rombel[]
        }
        setTahunId(t); setRombels(list); setMapels(ms); setGuruId(g)
      } catch (e: any) { toast(e.message, 'err') }
      finally { setBusy(false) }
    })()
  }, [])

  useEffect(() => {
    if (!rombelId || !mapelId || !tahunId) { setSiswaList([]); setVals({}); setIds({}); return }
    ;(async () => {
      try {
        const [siswa, nil] = await Promise.all([
          listSiswaRombel(rombelId, tahunId),
          listNilai(rombelId, mapelId, jenis, semester, tahunId),
        ])
        setSiswaList(siswa)
        const v: Record<string, string> = {}
        const k: Record<string, string | null> = {}
        nil.forEach((n) => { v[n.siswa_id] = String(n.nilai); k[n.siswa_id] = n.id ?? null })
        setVals(v); setIds(k)
      } catch (e: any) { toast(e.message, 'err') }
    })()
  }, [rombelId, mapelId, jenis, semester, tahunId])

  function setVal(siswaId: string, raw: string) {
    // izinkan angka & satu titik saja
    const t = raw.replace(/[^0-9.]/g, '')
    if ((t.match(/\./g) ?? []).length > 1) return
    setVals((p) => ({ ...p, [siswaId]: t }))
  }

  function parseRows(): { rows: { id: string | null; siswa_id: string; nilai: number | null }[]; err: string } {
    const rows: { id: string | null; siswa_id: string; nilai: number | null }[] = []
    let err = ''
    for (const s of siswaList) {
      const raw = (vals[s.id] ?? '').trim()
      if (raw === '') { rows.push({ id: ids[s.id] ?? null, siswa_id: s.id, nilai: null }); continue }
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 0 || n > 100) { err = `Nilai "${raw}" untuk ${s.nama} tidak valid (0-100)`; break }
      rows.push({ id: ids[s.id] ?? null, siswa_id: s.id, nilai: n })
    }
    return { rows, err }
  }

  async function simpan() {
    const { rows, err } = parseRows()
    if (err) return toast(err, 'err')
    setSimpanBusy(true)
    try {
      await simpanNilai(rows, guruId, mapelId, rombelId, jenis, semester, tahunId!)
      toast('Nilai tersimpan', 'ok')
      const nil = await listNilai(rombelId, mapelId, jenis, semester, tahunId!)
      const v: Record<string, string> = {}
      const k: Record<string, string | null> = {}
      nil.forEach((n) => { v[n.siswa_id] = String(n.nilai); k[n.siswa_id] = n.id ?? null })
      setVals(v); setIds(k)
    } catch (e: any) { toast(e.message, 'err') }
    finally { setSimpanBusy(false) }
  }

  const terisi = siswaList.filter((s) => (vals[s.id] ?? '').trim() !== '').length
  const rerata = (() => {
    const arr = siswaList.map((s) => Number(vals[s.id])).filter((n) => Number.isFinite(n) && n >= 0 && n <= 100)
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
  })()

  return (
    <div className="page-wrap">
      <h1 className="page-title">Nilai</h1>
      <p className="page-sub">Input nilai per rombel, mapel & jenis penilaian</p>

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
            <span>Jenis</span>
            <select className={inSel} value={jenis} onChange={(e) => setJenis(e.target.value)}>
              {JENIS_NILAI.map((j) => <option key={j} value={j}>{LABEL_JENIS[j]}</option>)}
            </select>
          </div>
          <div className="field">
            <span>Semester</span>
            <select className={inSel} value={semester} onChange={(e) => setSemester(Number(e.target.value))}>
              <option value={1}>1 (Ganjil)</option>
              <option value={2}>2 (Genap)</option>
            </select>
          </div>
        </div>
        {siswaList.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <span className="badge outline" style={{ fontSize: '0.72rem' }}>{terisi}/{siswaList.length} siswa terisi</span>
            {rerata !== null && <span className="badge outline" style={{ fontSize: '0.72rem' }}>Rata-rata kelas: {rerata.toFixed(2)}</span>}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {busy ? <p className="empty">Memuat...</p> : !rombelId || !mapelId ? (
          <div className="empty"><MIcon n="scoreboard" /><p>Pilih rombel & mapel dulu</p></div>
        ) : siswaList.length === 0 ? (
          <div className="empty"><MIcon n="groups" /><p>Rombel belum punya siswa (input di Data Siswa)</p></div>
        ) : siswaList.map((s, i) => {
          const v = vals[s.id] ?? ''
          return (
            <div key={s.id}>
              {i > 0 && <div className="list-divider" />}
              <div className="list-item">
                <div className="li-avatar">{s.nama.charAt(0)}</div>
                <div className="li-body">
                  <div className="li-title">{s.nama}</div>
                  <div className="li-sub">{s.nisn}</div>
                </div>
                <div className="li-trailing">
                  <input
                    className={inSel + ' num-input'}
                    inputMode="decimal"
                    placeholder="—"
                    value={v}
                    onChange={(e) => setVal(s.id, e.target.value)}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {siswaList.length > 0 && (
        <button className={btn + ' btn-block'} disabled={simpanBusy} onClick={() => setTanyaSimpan(true)}>
          {simpanBusy ? 'Menyimpan...' : `Simpan Nilai (${LABEL_JENIS[jenis]} · Semester ${semester})`}
        </button>
      )}

      <p style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', margin: '10px 2px' }}>
        <Link to="/rapor" style={{ color: 'var(--primary)' }}>Lihat rekap & cetak di halaman Rapor →</Link>
      </p>

      <Confirm open={tanyaSimpan} onClose={() => setTanyaSimpan(false)} onYes={simpan}
        title="Simpan nilai?" desc="Nilai yang dikosongkan akan dihapus; yang terisi di-update." />
    </div>
  )
}