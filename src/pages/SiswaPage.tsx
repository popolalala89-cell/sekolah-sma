import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import {
  listSiswa, simpanSiswa, hapusSiswa, tahunAktifId, listRombel,
  rombelSiswaMap, setRombelSiswa, buatAkunSiswa,
  type Siswa, type Rombel,
} from '../lib/db'
import { supabase } from '../lib/supabase'
import { Modal, Confirm, useToast, inSel, btn, btnTxt } from '../lib/ui'
import { MIcon } from '../lib/icons'

export default function SiswaPage() {
  const toast = useToast()
  const [rows, setRows] = useState<Siswa[]>([])
  const [tahunId, setTahunId] = useState<string | null>(null)
  const [rombels, setRombels] = useState<Rombel[]>([])
  const [rMap, setRMap] = useState<Map<string, string>>(new Map())
  const [cari, setCari] = useState('')
  const [busy, setBusy] = useState(true)

  const [form, setForm] = useState<Partial<Siswa> & { rombel_id?: string }>({})
  const [open, setOpen] = useState(false)
  const [hapusId, setHapusId] = useState<string | null>(null)

  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([])
  const [csvOpen, setCsvOpen] = useState(false)
  const [sedangImport, setSedangImport] = useState(false)

  const muat = async () => {
    const t = await tahunAktifId()
    setTahunId(t)
    const [s, r, rm] = await Promise.all([
      listSiswa(),
      t ? listRombel(t) : Promise.resolve([]),
      t ? rombelSiswaMap(t) : Promise.resolve(new Map<string, string>()),
    ])
    setRows(s); setRombels(r); setRMap(rm)
  }

  useEffect(() => {
    muat().catch((e: Error) => toast(e.message, 'err')).finally(() => setBusy(false))
  }, [])

  const namaRombelMap = useMemo(() => {
    const byId = new Map(rombels.map((x) => [x.id, x.nama]))
    const out = new Map<string, string>()
    rMap.forEach((rid, sid) => { const n = byId.get(rid); if (n) out.set(sid, n) })
    return out
  }, [rombels, rMap])

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return rows.filter((r) => !q || r.nama.toLowerCase().includes(q) || r.nisn.toLowerCase().includes(q))
  }, [rows, cari])

  async function simpan() {
    if (!form.nama?.trim() || !form.nisn?.trim()) return toast('NISN & nama wajib diisi', 'err')
    try {
      const id = await simpanSiswa(form as Partial<Siswa> & { nama: string; nisn: string })
      if (form.rombel_id && tahunId) await setRombelSiswa(id!, form.rombel_id, tahunId)
      toast('Tersimpan', 'ok')
      setOpen(false)
      await muat()
    } catch (e: any) { toast(e.message, 'err') }
  }

  async function hapus() {
    if (!hapusId) return
    try {
      await hapusSiswa(hapusId)
      toast('Terhapus', 'ok')
      setHapusId(null)
      await muat()
    } catch (e: any) { toast(e.message, 'err') }
  }

  async function buatAkun(s: Siswa) {
    try {
      const email = await buatAkunSiswa(s, s.nisn)
      toast(`Akun dibuat: ${email} / sandi: ${s.nisn}`, 'ok')
      await muat()
    } catch (e: any) { toast(e.message, 'err') }
  }

  function pilihCSV(f: File | null) {
    if (!f) return
    Papa.parse<Record<string, string>>(f, {
      header: true, skipEmptyLines: true,
      complete: (res) => { setCsvRows(res.data); setCsvPreview(res.data.slice(0, 5)) },
    })
  }

  async function imporCSV() {
    if (csvRows.length === 0) return toast('File tidak berisi data', 'err')
    setSedangImport(true)
    let ok = 0
    const errs: string[] = []
    for (let i = 0; i < csvRows.length; i += 100) {
      const batch = csvRows.slice(i, i + 100)
        .filter((r) => r.nisn?.trim() && r.nama?.trim())
        .map((r) => ({
          nisn: r.nisn.trim(), nama: r.nama.trim(),
          gender: r.gender === 'P' || r.gender === 'L' ? r.gender : null,
          tempat_lahir: r.tempat_lahir?.trim() || null,
          tgl_lahir: r.tgl_lahir?.trim() || null,
          alamat: r.alamat?.trim() || null,
          telepon: r.telepon?.trim() || null,
          angkatan: r.angkatan ? Number(r.angkatan) : null,
        }))
      if (batch.length === 0) continue
      try {
        const { error } = await supabase.from('siswa').insert(batch)
        if (error) throw error
        ok += batch.length
      } catch (e: any) { errs.push(e.message) }
    }
    setSedangImport(false)
    setCsvOpen(false)
    setCsvRows([])
    await muat()
    if (errs.length === 0) toast(`Import selesai: ${ok} siswa masuk`, 'ok')
    else toast(`${ok} masuk, ${errs.length} batch gagal`, 'err')
  }

  return (
    <div className="page-wrap">
      <h1 className="page-title">Data Siswa <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', fontWeight: 400 }}>({rows.length})</span></h1>
      <p className="page-sub">Master data & akun login siswa</p>

      <div className="search-wrap">
        <MIcon n="search" />
        <input placeholder="Cari nama / NISN..." value={cari} onChange={(e) => setCari(e.target.value)} />
      </div>

      <div className="chips">
        <button className="chip" onClick={() => setCsvOpen(true)}><MIcon n="upload_file" /> Import CSV</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {busy ? <p className="empty">Memuat...</p> : tampil.length === 0 ? (
          <div className="empty"><MIcon n="groups" /><p>{cari ? 'Tidak ada hasil' : 'Belum ada siswa'}</p></div>
        ) : tampil.map((s, i) => (
          <div key={s.id}>
            {i > 0 && <div className="list-divider" />}
            <div className="list-item">
              <div className="li-avatar">{s.nama.charAt(0)}</div>
              <div className="li-body">
                <div className="li-title">
                  {s.nama}
                  {s.gender && <span className={`badge ${s.gender === 'L' ? '' : 'error'}`} style={{ marginLeft: 8, background: s.gender === 'L' ? 'var(--secondary-container)' : 'var(--error-container)', color: s.gender === 'L' ? 'var(--on-secondary-container)' : 'var(--on-error-container)' }}>{s.gender}</span>}
                </div>
                <div className="li-sub">
                  {s.nisn} · {namaRombelMap.get(s.id) ?? 'belum dirombel'} · {s.user_id ? 'akun ada' : 'belum ada akun'}
                </div>
              </div>
              <div className="li-trailing">
                {!s.user_id && (
                  <button className="btn btn-sm" onClick={() => buatAkun(s)} title="Buat akun login">
                    <MIcon n="person_add" />
                  </button>
                )}
                <button className="icon-btn" title="Edit" onClick={() => { setForm({ ...s, rombel_id: rMap.get(s.id) }); setOpen(true) }}><MIcon n="edit" /></button>
                <button className="icon-btn" title="Hapus" onClick={() => setHapusId(s.id)}><MIcon n="delete" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="fab" title="Tambah siswa" onClick={() => { setForm({ gender: 'L' }); setOpen(true) }}>
        <MIcon n="add" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'Edit Siswa' : 'Siswa Baru'} wide>
        <div className="form-grid">
          <div className="field">
            <span>NISN *</span>
            <input className={inSel} value={form.nisn ?? ''} onChange={(e) => setForm({ ...form, nisn: e.target.value })} />
          </div>
          <div className="field">
            <span>Nama lengkap *</span>
            <input className={inSel} value={form.nama ?? ''} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </div>
          <div className="field">
            <span>Gender</span>
            <select className={inSel} value={form.gender ?? 'L'} onChange={(e) => setForm({ ...form, gender: e.target.value as 'L' | 'P' })}>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div className="field">
            <span>Rombel (tahun aktif)</span>
            <select className={inSel} value={form.rombel_id ?? ''} onChange={(e) => setForm({ ...form, rombel_id: e.target.value || undefined })}>
              <option value="">— tanpa rombel —</option>
              {rombels.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
            </select>
          </div>
          <div className="field">
            <span>Tempat lahir</span>
            <input className={inSel} value={form.tempat_lahir ?? ''} onChange={(e) => setForm({ ...form, tempat_lahir: e.target.value })} />
          </div>
          <div className="field">
            <span>Tanggal lahir</span>
            <input type="date" className={inSel} value={form.tgl_lahir ?? ''} onChange={(e) => setForm({ ...form, tgl_lahir: e.target.value })} />
          </div>
          <div className="field">
            <span>Angkatan</span>
            <input type="number" className={inSel} value={form.angkatan ?? ''} onChange={(e) => setForm({ ...form, angkatan: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className="field">
            <span>Telepon</span>
            <input className={inSel} value={form.telepon ?? ''} onChange={(e) => setForm({ ...form, telepon: e.target.value })} />
          </div>
          <div className="field span2">
            <span>Alamat</span>
            <input className={inSel} value={form.alamat ?? ''} onChange={(e) => setForm({ ...form, alamat: e.target.value })} />
          </div>
        </div>
        <div className="modal-actions">
          <button className={btnTxt} onClick={() => setOpen(false)}>Batal</button>
          <button className={btn} onClick={simpan}>Simpan</button>
        </div>
      </Modal>

      <Modal open={csvOpen} onClose={() => setCsvOpen(false)} title="Import CSV" wide>
        <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginBottom: 12 }}>
          Kolom didukung: <code style={{ background: 'var(--surface-container-high)', padding: '2px 6px', borderRadius: 6 }}>nisn*, nama*, gender (L/P), tempat_lahir, tgl_lahir (YYYY-MM-DD), alamat, telepon, angkatan</code>
        </p>
        <input type="file" accept=".csv,text/csv" style={{ fontSize: '0.85rem', marginBottom: 12 }}
          onChange={(e) => pilihCSV(e.target.files?.[0] ?? null)} />
        {csvPreview.length > 0 && (
          <>
            <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginBottom: 6 }}>
              Pratinjau {csvPreview.length} baris pertama (total {csvRows.length}):
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid var(--outline-variant)', borderRadius: 12, marginBottom: 14 }}>
              <table style={{ fontSize: '0.75rem', width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: 'var(--surface-container)', textAlign: 'left' }}>
                  {Object.keys(csvPreview[0] ?? {}).map((k) => <th key={k} style={{ padding: '6px 10px', fontWeight: 600 }}>{k}</th>)}
                </tr></thead>
                <tbody>
                  {csvPreview.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--outline-variant)' }}>
                      {Object.values(r).map((v, j) => <td key={j} style={{ padding: '6px 10px' }}>{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button className={btn} disabled={sedangImport} onClick={imporCSV}>
                {sedangImport ? 'Mengimpor...' : `Import ${csvRows.length} siswa`}
              </button>
            </div>
          </>
        )}
      </Modal>

      <Confirm open={!!hapusId} onClose={() => setHapusId(null)} onYes={hapus}
        title="Hapus siswa?" desc="Nilai, absensi, dan tagihan terkait ikut terhapus." />
    </div>
  )
}