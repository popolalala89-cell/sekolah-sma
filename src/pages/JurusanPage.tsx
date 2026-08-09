import { useEffect, useState } from 'react'
import { listJurusan, simpanJurusan, hapusJurusan, type Jurusan } from '../lib/db'
import { Modal, Confirm, useToast, inSel, btn } from '../lib/ui'
import { MIcon } from '../lib/icons'

export default function JurusanPage() {
  const toast = useToast()
  const [rows, setRows] = useState<Jurusan[]>([])
  const [form, setForm] = useState<Partial<Jurusan>>({})
  const [open, setOpen] = useState(false)
  const [hapusId, setHapusId] = useState<string | null>(null)

  useEffect(() => { listJurusan().then(setRows) }, [])

  async function simpan() {
    if (!form.kode?.trim() || !form.nama?.trim()) return toast('Kode & nama wajib', 'err')
    try {
      await simpanJurusan(form as Jurusan)
      toast('Tersimpan', 'ok'); setOpen(false); setRows(await listJurusan())
    } catch (e: any) { toast(e.message, 'err') }
  }

  async function hapus() {
    if (!hapusId) return
    try { await hapusJurusan(hapusId); toast('Terhapus', 'ok'); setHapusId(null); setRows(await listJurusan()) }
    catch (e: any) { toast(e.message, 'err') }
  }

  return (
    <div className="page-wrap">
      <h1 className="page-title">Jurusan <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', fontWeight: 400 }}>({rows.length})</span></h1>
      <p className="page-sub">Penjurusan IPA / IPS / Bahasa</p>

      <div className="card" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div className="empty"><MIcon n="category" /><p>Belum ada jurusan</p></div>
        ) : rows.map((j, i) => (
          <div key={j.id}>
            {i > 0 && <div className="list-divider" />}
            <div className="list-item">
              <div className="li-avatar">{j.kode.slice(0, 1)}</div>
              <div className="li-body">
                <div className="li-title"><span className="badge primary" style={{ marginRight: 8 }}>{j.kode}</span>{j.nama}</div>
              </div>
              <div className="li-trailing">
                <button className="icon-btn" title="Edit" onClick={() => { setForm(j); setOpen(true) }}><MIcon n="edit" /></button>
                <button className="icon-btn" title="Hapus" onClick={() => setHapusId(j.id)}><MIcon n="delete" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="fab" title="Tambah jurusan" onClick={() => { setForm({}); setOpen(true) }}>
        <MIcon n="add" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'Edit Jurusan' : 'Jurusan Baru'}>
        <div className="field">
          <span>Kode (IPA / IPS / BHS)</span>
          <input className={inSel} value={form.kode ?? ''}
            onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })} />
        </div>
        <div className="field">
          <span>Nama</span>
          <input className={inSel} value={form.nama ?? ''}
            onChange={(e) => setForm({ ...form, nama: e.target.value })} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-text" onClick={() => setOpen(false)}>Batal</button>
          <button className={btn} onClick={simpan}>Simpan</button>
        </div>
      </Modal>

      <Confirm open={!!hapusId} onClose={() => setHapusId(null)} onYes={hapus}
        title="Hapus jurusan?" desc="Jurusan yang dipakai rombel tidak bisa dihapus." />
    </div>
  )
}