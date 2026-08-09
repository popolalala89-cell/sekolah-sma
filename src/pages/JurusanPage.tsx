import { useEffect, useState } from 'react'
import { listJurusan, simpanJurusan, hapusJurusan, type Jurusan } from '../lib/db'
import { Modal, useToast, inSel, btn, btnKms, btnDgr } from '../lib/ui'
import { Link } from 'react-router-dom'

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
    <div className="min-h-screen bg-slate-100">
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Jurusan</h2>
          <button className={btn} onClick={() => { setForm({}); setOpen(true) }}>+ Tambah</button>
        </div>
        <Link to="/" className="text-blue-600 text-sm">← Dashboard</Link>
        <div className="bg-white rounded-xl shadow divide-y">
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">Belum ada jurusan</p>
          ) : rows.map((j) => (
            <div key={j.id} className="p-3 flex items-center justify-between">
              <div>
                <span className="inline-block bg-blue-100 text-blue-700 text-xs font-mono rounded px-2 py-0.5 mr-2">{j.kode}</span>
                <span className="text-slate-800">{j.nama}</span>
              </div>
              <div className="flex gap-2">
                <button className={btnKms} onClick={() => { setForm(j); setOpen(true) }}>Edit</button>
                <button className={btnDgr} onClick={() => setHapusId(j.id)}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'Edit Jurusan' : 'Jurusan Baru'}>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-slate-600">Kode (IPA / IPS / BHS)</span>
            <input className={inSel + ' mt-1'} value={form.kode ?? ''}
              onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })} />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Nama</span>
            <input className={inSel + ' mt-1'} value={form.nama ?? ''}
              onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </label>
          <div className="flex gap-2 justify-end pt-2">
            <button className={btnKms} onClick={() => setOpen(false)}>Batal</button>
            <button className={btn} onClick={simpan}>Simpan</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!hapusId} onClose={() => setHapusId(null)} title="Konfirmasi Hapus">
        <p className="text-sm text-slate-600 mb-4">Hapus jurusan ini?</p>
        <div className="flex gap-2 justify-end">
          <button className={btnKms} onClick={() => setHapusId(null)}>Batal</button>
          <button className={btnDgr} onClick={hapus}>Ya, hapus</button>
        </div>
      </Modal>
    </div>
  )
}