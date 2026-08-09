import { useEffect, useState } from 'react'
import { listGuru, simpanGuru, hapusGuru, type Guru } from '../lib/db'
import { Modal, useToast, inSel, btn, btnKms, btnDgr } from '../lib/ui'
import { Link } from 'react-router-dom'

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
    <label className="block text-sm">
      <span className="text-slate-600">{label}</span>
      <input className={inSel + ' mt-1'} value={form[k] ?? ''}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={ph} />
    </label>
  )

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Data Guru</h2>
          <button className={btn} onClick={() => { setForm({}); setOpen(true) }}>+ Tambah</button>
        </div>
        <Link to="/" className="text-sm text-blue-600">← Dashboard</Link>
        <div className="bg-white rounded-xl shadow divide-y">
          {busy ? <p className="p-4 text-sm text-slate-400">Memuat...</p> : rows.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">Belum ada guru</p>
          ) : rows.map((g) => (
            <div key={g.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-800">{g.nama}</div>
                <div className="text-xs text-slate-400">{g.nip ?? '-'} · {g.mapel_utama ?? '-'}</div>
              </div>
              <div className="flex gap-2">
                <button className={btnKms} onClick={() => { setForm(g); setOpen(true) }}>Edit</button>
                <button className={btnDgr} onClick={() => setHapusId(g.id)}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'Edit Guru' : 'Guru Baru'}>
        <div className="space-y-3">
          <F k="nama" label="Nama lengkap" />
          <F k="nip" label="NIP" />
          <F k="mapel_utama" label="Mapel utama" />
          <div className="flex gap-2 justify-end pt-2">
            <button className={btnKms} onClick={() => setOpen(false)}>Batal</button>
            <button className={btn} onClick={simpan}>Simpan</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!hapusId} onClose={() => setHapusId(null)} title="Konfirmasi Hapus">
        <p className="text-sm text-slate-600 mb-4">Hapus guru ini? Tindakan tidak bisa dibatalkan.</p>
        <div className="flex gap-2 justify-end">
          <button className={btnKms} onClick={() => setHapusId(null)}>Batal</button>
          <button className={btnDgr} onClick={hapus}>Ya, hapus</button>
        </div>
      </Modal>
    </div>
  )
}