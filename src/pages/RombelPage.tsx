import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { tahunAktifId, listRombel, simpanRombel, hapusRombel, listJurusan, listGuru, type Rombel, type Jurusan, type Guru } from '../lib/db'
import { Modal, useToast, inSel, btn, btnKms, btnDgr } from '../lib/ui'

export default function RombelPage() {
  const toast = useToast()
  const [tahunId, setTahunId] = useState<string | null>(null)
  const [rows, setRows] = useState<Rombel[]>([])
  const [jurusan, setJurusan] = useState<Jurusan[]>([])
  const [gurus, setGurus] = useState<Guru[]>([])
  const [form, setForm] = useState<Partial<Rombel>>({})
  const [open, setOpen] = useState(false)
  const [hapusId, setHapusId] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)

  const muat = async () => {
    const t = await tahunAktifId()
    setTahunId(t)
    if (t) setRows(await listRombel(t))
    setBusy(false)
  }

  useEffect(() => {
    Promise.all([muat(), listJurusan().then(setJurusan), listGuru().then(setGurus)])
      .catch((e: Error) => toast(e.message, 'err'))
  }, [])

  async function simpan() {
    if (!form.nama?.trim() || !form.tingkat) return toast('Nama & tingkat wajib diisi', 'err')
    if (!tahunId) return toast('Tahun ajaran aktif belum dibuat', 'err')
    try {
      await simpanRombel(form as Rombel & { nama: string; tingkat: number }, tahunId)
      toast('Tersimpan', 'ok')
      setOpen(false)
      await muat()
    } catch (e: any) { toast(e.message, 'err') }
  }

  async function hapus() {
    if (!hapusId) return
    try {
      await hapusRombel(hapusId)
      toast('Terhapus', 'ok')
      setHapusId(null)
      await muat()
    } catch (e: any) { toast(e.message, 'err') }
  }

  const jurusanNama = (id: string | null) => jurusan.find((j) => j.id === id)?.kode ?? '-'
  const guruNama = (id: string | null) => gurus.find((g) => g.id === id)?.nama ?? '-'

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Rombel <span className="text-sm text-slate-400">(tahun ajaran aktif)</span></h2>
          <button className={btn} onClick={() => { setForm({ tingkat: 10, nama: '' }); setOpen(true) }}>+ Rombel</button>
        </div>
        <Link to="/" className="text-blue-600 text-sm">← Dashboard</Link>
        <div className="bg-white rounded-xl shadow divide-y">
          {busy ? <p className="p-4 text-sm text-slate-400">Memuat...</p> : rows.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">Belum ada rombel</p>
          ) : rows.map((r) => (
            <div key={r.id} className="p-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-slate-800">{r.nama}</span>
                <span className="text-xs text-slate-400 ml-2">
                  Wali: {guruNama(r.wali_kelas_guru_id)}
                </span>
                <div className="text-xs text-slate-400 mt-0.5">Jurusan {jurusanNama(r.jurusan_id)}</div>
              </div>
              <div className="flex gap-2">
                <button className={btnKms} onClick={() => { setForm(r); setOpen(true) }}>Edit</button>
                <button className={btnDgr} onClick={() => setHapusId(r.id)}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'Edit Rombel' : 'Rombel Baru'}>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-slate-600">Tingkat</span>
            <select className={inSel + ' mt-1'} value={form.tingkat ?? 10}
              onChange={(e) => setForm({ ...form, tingkat: Number(e.target.value) })}>
              <option value={10}>X (10)</option>
              <option value={11}>XI (11)</option>
              <option value={12}>XII (12)</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Jurusan</span>
            <select className={inSel + ' mt-1'} value={form.jurusan_id ?? ''}
              onChange={(e) => setForm({ ...form, jurusan_id: e.target.value || null })}>
              <option value="">— tanpa jurusan —</option>
              {jurusan.map((j) => <option key={j.id} value={j.id}>{j.kode} — {j.nama}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Nama rombel</span>
            <input className={inSel + ' mt-1'} value={form.nama ?? ''}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="contoh: X-IPA-1" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Wali kelas</span>
            <select className={inSel + ' mt-1'} value={form.wali_kelas_guru_id ?? ''}
              onChange={(e) => setForm({ ...form, wali_kelas_guru_id: e.target.value || null })}>
              <option value="">— belum ada —</option>
              {gurus.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
            </select>
          </label>
          <div className="flex gap-2 justify-end pt-2">
            <button className={btnKms} onClick={() => setOpen(false)}>Batal</button>
            <button className={btn} onClick={simpan}>Simpan</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!hapusId} onClose={() => setHapusId(null)} title="Konfirmasi Hapus">
        <p className="text-sm text-slate-600 mb-4">Hapus rombel ini? Anggota siswa di dalamnya ikut terhapus relasinya.</p>
        <div className="flex gap-2 justify-end">
          <button className={btnKms} onClick={() => setHapusId(null)}>Batal</button>
          <button className={btnDgr} onClick={hapus}>Ya, hapus</button>
        </div>
      </Modal>
    </div>
  )
}