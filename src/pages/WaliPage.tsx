import { useEffect, useMemo, useState } from 'react'
import {
  listWali, simpanWali, hapusWali, waliSiswaMap, setWaliSiswa, buatAkunWali,
  listSiswa,
  type WaliMurid, type Siswa,
} from '../lib/db'
import { Modal, Confirm, useToast, inSel, btn, btnTxt } from '../lib/ui'
import { MIcon } from '../lib/icons'

export default function WaliPage() {
  const toast = useToast()
  const [rows, setRows] = useState<WaliMurid[]>([])
  const [anakMap, setAnakMap] = useState<Map<string, string[]>>(new Map())
  const [siswas, setSiswas] = useState<Siswa[]>([])
  const [cari, setCari] = useState('')
  const [busy, setBusy] = useState(true)

  const [form, setForm] = useState<Partial<WaliMurid>>({})
  const [pilihAnak, setPilihAnak] = useState<string[]>([])
  const [cariAnak, setCariAnak] = useState('')
  const [open, setOpen] = useState(false)
  const [hapusId, setHapusId] = useState<string | null>(null)

  const muat = async () => {
    const [w, am, s] = await Promise.all([listWali(), waliSiswaMap(), listSiswa()])
    setRows(w); setAnakMap(am); setSiswas(s)
  }

  useEffect(() => {
    muat().catch((e: Error) => toast(e.message, 'err')).finally(() => setBusy(false))
  }, [])

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return rows.filter((r) => !q || r.nama.toLowerCase().includes(q) || (r.telepon ?? '').includes(q))
  }, [rows, cari])

  const daftarAnak = useMemo(() => {
    const q = cariAnak.trim().toLowerCase()
    return siswas.filter((s) => !q || s.nama.toLowerCase().includes(q) || s.nisn.toLowerCase().includes(q))
  }, [siswas, cariAnak])

  async function simpan() {
    if (!form.nama?.trim()) return toast('Nama wali wajib diisi', 'err')
    try {
      const id = await simpanWali(form as Partial<WaliMurid> & { nama: string })
      if (id) await setWaliSiswa(id, pilihAnak)
      toast('Tersimpan', 'ok')
      setOpen(false)
      await muat()
    } catch (e: any) { toast(e.message, 'err') }
  }

  async function hapus() {
    if (!hapusId) return
    try {
      await hapusWali(hapusId)
      toast('Terhapus', 'ok')
      setHapusId(null)
      await muat()
    } catch (e: any) { toast(e.message, 'err') }
  }

  async function buatAkun(w: WaliMurid) {
    try {
      const email = await buatAkunWali(w, w.telepon?.replace(/\D/g, '').slice(-6) || '123456')
      toast(`Akun dibuat: ${email} / sandi: ${w.telepon?.replace(/\D/g, '').slice(-6) || '123456'}`, 'ok')
      await muat()
    } catch (e: any) { toast(e.message, 'err') }
  }

  function toggleAnak(sid: string) {
    setPilihAnak((p) => p.includes(sid) ? p.filter((x) => x !== sid) : [...p, sid])
  }

  return (
    <div className="page-wrap">
      <h1 className="page-title">Wali Murid <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', fontWeight: 400 }}>({rows.length})</span></h1>
      <p className="page-sub">Orang tua / wali & link ke anaknya</p>

      <div className="search-wrap">
        <MIcon n="search" />
        <input placeholder="Cari nama wali / telepon..." value={cari} onChange={(e) => setCari(e.target.value)} />
      </div>

      <div className="card" style={{ padding: 0 }}>
        {busy ? <p className="empty">Memuat...</p> : tampil.length === 0 ? (
          <div className="empty"><MIcon n="account_circle" /><p>{cari ? 'Tidak ada hasil' : 'Belum ada wali'}</p></div>
        ) : tampil.map((w, i) => {
          const anak = anakMap.get(w.id) ?? []
          return (
            <div key={w.id}>
              {i > 0 && <div className="list-divider" />}
              <div className="list-item">
                <div className="li-avatar">{w.nama.charAt(0)}</div>
                <div className="li-body">
                  <div className="li-title">{w.nama}</div>
                  <div className="li-sub">
                    {w.telepon ?? 'no telepon'} · {anak.length} anak · {w.user_id ? 'akun ada' : 'belum ada akun'}
                  </div>
                </div>
                <div className="li-trailing">
                  {!w.user_id && (
                    <button className="btn btn-sm" onClick={() => buatAkun(w)} title="Buat akun login">
                      <MIcon n="person_add" />
                    </button>
                  )}
                  <button className="icon-btn" title="Edit" onClick={() => {
                    setForm({ ...w })
                    setPilihAnak(anakMap.get(w.id) ?? [])
                    setCariAnak('')
                    setOpen(true)
                  }}><MIcon n="edit" /></button>
                  <button className="icon-btn" title="Hapus" onClick={() => setHapusId(w.id)}><MIcon n="delete" /></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button className="fab" title="Tambah wali" onClick={() => { setForm({}); setPilihAnak([]); setCariAnak(''); setOpen(true) }}>
        <MIcon n="add" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'Edit Wali' : 'Wali Baru'} wide>
        <div className="form-grid">
          <div className="field">
            <span>Nama lengkap *</span>
            <input className={inSel} value={form.nama ?? ''} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </div>
          <div className="field">
            <span>Telepon (jadi sandi awal akun)</span>
            <input className={inSel} value={form.telepon ?? ''} onChange={(e) => setForm({ ...form, telepon: e.target.value })} />
          </div>
        </div>

        <div style={{ marginTop: 14, marginBottom: 6, fontSize: '0.85rem', fontWeight: 600 }}>Anak (bisa lebih dari satu)</div>
        <div className="search-wrap" style={{ marginBottom: 8 }}>
          <MIcon n="search" />
          <input placeholder="Cari siswa..." value={cariAnak} onChange={(e) => setCariAnak(e.target.value)} />
        </div>
        <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--outline-variant)', borderRadius: 12 }}>
          {daftarAnak.length === 0 ? (
            <p className="empty" style={{ padding: 16 }}>Tidak ada siswa</p>
          ) : daftarAnak.map((s) => {
            const on = pilihAnak.includes(s.id)
            return (
              <label key={s.id} className="list-item" style={{ cursor: 'pointer' }} onClick={() => toggleAnak(s.id)}>
                <span className={`checkbox${on ? ' on' : ''}`}>{on && <MIcon n="check" />}</span>
                <div className="li-body">
                  <div className="li-title">{s.nama}</div>
                  <div className="li-sub">{s.nisn}</div>
                </div>
              </label>
            )
          })}
        </div>

        <div className="modal-actions">
          <button className={btnTxt} onClick={() => setOpen(false)}>Batal</button>
          <button className={btn} onClick={simpan}>Simpan</button>
        </div>
      </Modal>

      <Confirm open={!!hapusId} onClose={() => setHapusId(null)} onYes={hapus}
        title="Hapus wali?" desc="Relasi wali-ke-anak ikut terhapus." />
    </div>
  )
}
