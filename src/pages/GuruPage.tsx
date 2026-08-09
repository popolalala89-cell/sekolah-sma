import { useEffect, useState } from 'react'
import { listGuru, simpanGuru, hapusGuru, type Guru } from '../lib/db'
import { Modal, Confirm, useToast, inSel, btn } from '../lib/ui'
import { MIcon } from '../lib/icons'

export default function GuruPage() {
  const toast = useToast()
  const [rows, setRows] = useState<Guru[]>([])
  const [busy, setBusy] = useState(true)
  const [form, setForm] = useState<Partial<Guru>>({})
  const [open, setOpen] = useState(false)
  const [hapusId, setHapusId] = useState<string | null>(null)

  useEffect(() => {
    listGuru().then(setRows).catch((e) => toast(e.message, 'err')).finally(() => setBusy(false))
  }, [])

  async function simpan() {
    if (!form.nama?.trim()) return toast('Nama wajib diisi', 'err')
    try {
      await simpanGuru(form as Guru & { nama: string })
      toast('Tersimpan', 'ok'); setOpen(false)
      setRows(await listGuru())
    } catch (e: any) { toast(e.message, 'err') }
  }

  async function hapus() {
    if (!hapusId) return
    try {
      await hapusGuru(hapusId)
      toast('Terhapus', 'ok'); setHapusId(null)
      setRows(await listGuru())
    } catch (e: any) { toast(e.message, 'err') }
  }

  const F = ({ k, label, ph }: { k: keyof Guru; label: string; ph?: string }) => (
    <div className="field">
      <span>{label}</span>
      <input className={inSel} value={(form[k] as string) ?? ''}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={ph} />
    </div>
  )

  return (
    <div className="page-wrap">
      <h1 className="page-title">Data Guru <span style={{ color: 'var(--on-surface-variant)', fontWeight: 400, fontSize: '0.9rem' }}>({rows.length})</span></h1>
      <p className="page-sub">Profil tenaga pendidik</p>

      <div className="card" style={{ padding: 0 }}>
        {busy ? <p className="empty">Memuat...</p> : rows.length === 0 ? (
          <div className="empty"><MIcon n="school" /><p>Belum ada guru</p></div>
        ) : rows.map((g, i) => (
          <div key={g.id}>
            {i > 0 && <div className="list-divider" />}
            <div className="list-item">
              <div className="li-avatar">{g.nama.charAt(0)}</div>
              <div className="li-body">
                <div className="li-title">{g.nama}</div>
                <div className="li-sub">{g.nip ?? '-'} · {g.mapel_utama ?? '-'}</div>
              </div>
              <div className="li-trailing">
                <button className="icon-btn" title="Edit" onClick={() => { setForm(g); setOpen(true) }}>
                  <MIcon n="edit" />
                </button>
                <button className="icon-btn" title="Hapus" onClick={() => setHapusId(g.id)}>
                  <MIcon n="delete" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="fab" title="Tambah guru" onClick={() => { setForm({}); setOpen(true) }}>
        <MIcon n="add" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'Edit Guru' : 'Tambah Guru'}>
        <F k="nama" label="Nama lengkap" />
        <F k="nip" label="NIP" />
        <F k="mapel_utama" label="Mapel utama" />
        <div className="modal-actions">
          <button className="btn btn-text" onClick={() => setOpen(false)}>Batal</button>
          <button className={btn} onClick={simpan}>Simpan</button>
        </div>
      </Modal>

      <Confirm open={!!hapusId} onClose={() => setHapusId(null)} onYes={hapus}
        title="Hapus guru?" desc="Tindakan tidak bisa dibatalkan." />
    </div>
  )
}